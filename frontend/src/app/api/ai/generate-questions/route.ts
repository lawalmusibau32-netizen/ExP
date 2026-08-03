import { NextRequest } from 'next/server';
import { z } from 'zod';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getAuthUser, hasRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ok, fail, unauthorized, forbidden } from '@/lib/api';

const QuestionType = z.enum(['MCQ', 'TRUE_FALSE', 'FILL_BLANK', 'SUBJECTIVE']);

const GeneratedQuestion = z.object({
  content: z.string().min(1),
  questionType: QuestionType,
  points: z.number().int().min(1).max(20).default(1),
  choices: z.array(z.string().min(1)).min(2).max(6).optional(),
  correctAnswer: z.string().min(1),
  explanation: z.string().optional(),
});

const GeneratedSet = z.object({ questions: z.array(GeneratedQuestion).min(1).max(20) });

const requestSchema = z.object({
  topic: z.string().min(3).max(500),
  questionBankId: z.union([z.string(), z.number()]),
  count: z.number().int().min(1).max(20).default(5),
  types: z.array(QuestionType).min(1).optional(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
  extraInstructions: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN', 'LECTURER'])) return forbidden();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fail('AI question generation is not configured. Contact an administrator.', 503);
  }

  let body;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return fail('Topic is required (3+ characters) and count must be between 1 and 20');
  }

  const bank = await prisma.questionBank.findUnique({ where: { id: BigInt(String(body.questionBankId)) } });
  if (!bank) return fail('Question bank not found', 404);

  const typeMix = body.types?.length
    ? body.types.join(', ')
    : 'MCQ, TRUE_FALSE, FILL_BLANK, SUBJECTIVE (mix, preferring MCQ)';

  const prompt = `You are an expert exam question writer. Generate exactly ${body.count} question(s) about the topic: "${body.topic}".

Requirements:
- Difficulty: ${body.difficulty ?? 'Medium'}
- Question types allowed: ${typeMix}
- Each question must be self-contained and unambiguous.
- MCQ questions need 4 choices (A-D) with exactly one correct answer.
- TRUE_FALSE correctAnswer is "true" or "false".
- FILL_BLANK correctAnswer is the expected word/phrase.
- SUBJECTIVE correctAnswer is a concise model answer for the lecturer.
- Include a brief explanation for every question.
${body.extraInstructions ? `- Extra lecturer instructions: ${body.extraInstructions}` : ''}

Return ONLY a JSON object in this exact shape (no markdown fences, no commentary):
{
  "questions": [
    {
      "content": "question text",
      "questionType": "MCQ | TRUE_FALSE | FILL_BLANK | SUBJECTIVE",
      "points": 1,
      "choices": ["option A", "option B", "option C", "option D"],
      "correctAnswer": "the correct option",
      "explanation": "why this is correct"
    }
  ]
}`;

  try {
    const google = createGoogleGenerativeAI({ apiKey });
    const { object } = await generateObject({
      model: google('gemini-flash-latest'),
      schema: GeneratedSet,
      schemaName: 'GeneratedQuestions',
      schemaDescription: `A set of ${body.count} exam questions about the given topic`,
      prompt,
      temperature: 0.7,
    });

    const questions = object.questions.slice(0, body.count).map((q) => {
      const isMcq = q.questionType === 'MCQ';
      return {
        content: q.content.trim(),
        questionType: q.questionType,
        points: q.points,
        choices: isMcq && q.choices && q.choices.length >= 2 ? { options: q.choices } : null,
        correctAnswer: q.correctAnswer.trim(),
        explanation: q.explanation?.trim() || null,
      };
    });

    return ok(questions, `Generated ${questions.length} question(s)`);
  } catch (err) {
    console.error('AI generate failed:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('429') || message.includes('quota') || message.includes('rate limit')) {
      return fail('AI service is rate-limited right now. Try again in a minute.', 429);
    }
    return fail('Question generation failed. Please try again.', 502);
  }
}
