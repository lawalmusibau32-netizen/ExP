const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data in dependency order
  await prisma.loginHistory.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.result.deleteMany();
  await prisma.studentAnswer.deleteMany();
  await prisma.examAttempt.deleteMany();
  await prisma.examQuestion.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.question.deleteMany();
  await prisma.questionBank.deleteMany();
  await prisma.courseEnrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();

  const hash = (pw) => bcrypt.hashSync(pw, 10);

  // --- Users ---
  const admin = await prisma.user.create({
    data: {
      email: 'admin@exams.local',
      loginId: 'ADMIN-001',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
      passwordHash: hash('Admin@123'),
    },
  });

  const lecturer1 = await prisma.user.create({
    data: {
      email: 'lecturer1@exams.local',
      loginId: 'LEC-001',
      firstName: 'John',
      lastName: 'Okafor',
      role: 'LECTURER',
      passwordHash: hash('Lecturer@123'),
    },
  });

  const lecturer2 = await prisma.user.create({
    data: {
      email: 'lecturer2@exams.local',
      loginId: 'LEC-002',
      firstName: 'Chioma',
      lastName: 'Adebayo',
      role: 'LECTURER',
      passwordHash: hash('Lecturer@123'),
    },
  });

  const student1 = await prisma.user.create({
    data: {
      email: 'student1@exams.local',
      loginId: 'STU-001',
      firstName: 'Emeka',
      lastName: 'Nwachukwu',
      role: 'STUDENT',
      passwordHash: hash('Student@123'),
    },
  });

  const student2 = await prisma.user.create({
    data: {
      email: 'student2@exams.local',
      loginId: 'STU-002',
      firstName: 'Amina',
      lastName: 'Yusuf',
      role: 'STUDENT',
      passwordHash: hash('Student@123'),
    },
  });

  const student3 = await prisma.user.create({
    data: {
      email: 'student3@exams.local',
      loginId: 'STU-003',
      firstName: 'Tunde',
      lastName: 'Balogun',
      role: 'STUDENT',
      passwordHash: hash('Student@123'),
    },
  });

  // --- Departments ---
  const deptCS = await prisma.department.create({
    data: {
      name: 'Computer Science',
      code: 'CSC',
      description: 'Department of Computer Science',
    },
  });

  const deptMath = await prisma.department.create({
    data: {
      name: 'Mathematics',
      code: 'MAT',
      description: 'Department of Mathematics',
    },
  });

  const deptPhysics = await prisma.department.create({
    data: {
      name: 'Physics',
      code: 'PHY',
      description: 'Department of Physics',
    },
  });

  // --- Courses ---
  const courseDS = await prisma.course.create({
    data: {
      departmentId: deptCS.id,
      title: 'Data Structures and Algorithms',
      code: 'CSC201',
      description: 'Fundamental data structures and algorithm analysis',
      credits: 4,
    },
  });

  const courseDB = await prisma.course.create({
    data: {
      departmentId: deptCS.id,
      title: 'Database Systems',
      code: 'CSC301',
      description: 'Relational databases, SQL, and normalization',
      credits: 3,
    },
  });

  const courseOS = await prisma.course.create({
    data: {
      departmentId: deptCS.id,
      title: 'Operating Systems',
      code: 'CSC302',
      description: 'Process management, memory management, file systems',
      credits: 3,
    },
  });

  const courseCalc = await prisma.course.create({
    data: {
      departmentId: deptMath.id,
      title: 'Calculus II',
      code: 'MAT202',
      description: 'Integration techniques, sequences, and series',
      credits: 4,
    },
  });

  const courseLinear = await prisma.course.create({
    data: {
      departmentId: deptMath.id,
      title: 'Linear Algebra',
      code: 'MAT301',
      description: 'Vector spaces, matrices, eigenvalues and eigenvectors',
      credits: 3,
    },
  });

  // --- Enrollments ---
  const enrollments = [
    { student: student1, course: courseDS },
    { student: student1, course: courseDB },
    { student: student1, course: courseCalc },
    { student: student1, course: courseLinear },
    { student: student2, course: courseDS },
    { student: student2, course: courseOS },
    { student: student2, course: courseCalc },
    { student: student3, course: courseDB },
    { student: student3, course: courseOS },
    { student: student3, course: courseLinear },
  ];

  for (const { student, course } of enrollments) {
    await prisma.courseEnrollment.create({
      data: { studentId: student.id, courseId: course.id },
    });
  }

  // --- Question Banks ---
  const bankDS = await prisma.questionBank.create({
    data: {
      title: 'Data Structures Midterm Bank',
      description: 'Questions for CSC201 midterm examination',
      courseId: courseDS.id,
      createdById: lecturer1.id,
    },
  });

  const bankDB = await prisma.questionBank.create({
    data: {
      title: 'Database Systems Final Bank',
      description: 'Questions for CSC301 final examination',
      courseId: courseDB.id,
      createdById: lecturer1.id,
    },
  });

  const bankCalc = await prisma.questionBank.create({
    data: {
      title: 'Calculus II Quiz Bank',
      description: 'Questions for MAT202 quizzes and tests',
      courseId: courseCalc.id,
      createdById: lecturer2.id,
    },
  });

  // --- Questions ---
  await prisma.question.createMany({
    data: [
      // Data Structures questions
      {
        questionBankId: bankDS.id,
        content: 'What is the time complexity of binary search on a sorted array?',
        questionType: 'MCQ',
        points: 2,
        choices: { options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'] },
        correctAnswer: 'O(log n)',
        explanation: 'Binary search halves the search space at each step, giving logarithmic time complexity.',
      },
      {
        questionBankId: bankDS.id,
        content: 'A stack follows which principle?',
        questionType: 'MCQ',
        points: 1,
        choices: { options: ['First-In-First-Out (FIFO)', 'Last-In-First-Out (LIFO)', 'Random access', 'Priority-based'] },
        correctAnswer: 'Last-In-First-Out (LIFO)',
        explanation: 'Stacks operate on the LIFO principle where the last element added is the first removed.',
      },
      {
        questionBankId: bankDS.id,
        content: 'A linked list node contains a pointer to the next node.',
        questionType: 'TRUE_FALSE',
        points: 1,
        correctAnswer: 'true',
      },
      {
        questionBankId: bankDS.id,
        content: 'The worst-case time complexity of quicksort is O(n log n).',
        questionType: 'TRUE_FALSE',
        points: 1,
        correctAnswer: 'false',
        explanation: 'Quicksort has a worst-case time complexity of O(n²) when poor pivot choices are made.',
      },
      {
        questionBankId: bankDS.id,
        content: 'Define a binary search tree and list three common operations on it.',
        questionType: 'SUBJECTIVE',
        points: 5,
        explanation: 'A BST is a tree where each node has at most two children, with left child < parent < right child. Common operations: insert, delete, search.',
      },

      // Database questions
      {
        questionBankId: bankDB.id,
        content: 'Which SQL clause is used to filter records after aggregation?',
        questionType: 'MCQ',
        points: 2,
        choices: { options: ['WHERE', 'HAVING', 'FILTER', 'LIMIT'] },
        correctAnswer: 'HAVING',
        explanation: 'HAVING filters groups after aggregation, while WHERE filters rows before grouping.',
      },
      {
        questionBankId: bankDB.id,
        content: 'What is the purpose of database normalization?',
        questionType: 'FILL_BLANK',
        points: 2,
        correctAnswer: 'reduce data redundancy and eliminate anomalies',
        explanation: 'Normalization minimizes data redundancy and avoids insertion, update, and deletion anomalies.',
      },
      {
        questionBankId: bankDB.id,
        content: 'Which normal form requires that every non-key attribute is fully functionally dependent on the primary key?',
        questionType: 'MCQ',
        points: 2,
        choices: { options: ['1NF', '2NF', '3NF', 'BCNF'] },
        correctAnswer: '2NF',
        explanation: '2NF requires 1NF plus full functional dependency of non-key attributes on the primary key.',
      },
      {
        questionBankId: bankDB.id,
        content: 'A table in 3NF is automatically in BCNF.',
        questionType: 'TRUE_FALSE',
        points: 1,
        correctAnswer: 'false',
        explanation: 'A table can be in 3NF but not BCNF if there are overlapping candidate keys.',
      },
      {
        questionBankId: bankDB.id,
        content: 'Explain ACID properties in database transactions.',
        questionType: 'SUBJECTIVE',
        points: 5,
        explanation: 'Atomicity, Consistency, Isolation, Durability — the four properties that guarantee reliable transaction processing.',
      },

      // Calculus questions
      {
        questionBankId: bankCalc.id,
        content: 'What is the integral of 2x with respect to x?',
        questionType: 'MCQ',
        points: 2,
        choices: { options: ['x² + C', 'x²', '2x² + C', 'x²/2 + C'] },
        correctAnswer: 'x² + C',
        explanation: '∫ 2x dx = x² + C using the power rule.',
      },
      {
        questionBankId: bankCalc.id,
        content: 'The integral of 1/x is ln|x| + C.',
        questionType: 'TRUE_FALSE',
        points: 1,
        correctAnswer: 'true',
      },
      {
        questionBankId: bankCalc.id,
        content: 'What is the limit of (sin x)/x as x approaches 0?',
        questionType: 'FILL_BLANK',
        points: 2,
        correctAnswer: '1',
        explanation: 'This is a fundamental limit used in calculus.',
      },
    ],
  });

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
