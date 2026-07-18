import "dotenv/config";

import { seedQuestionBank } from "../prisma/seed";

seedQuestionBank()
  .then(() => {
    console.log("Question bank seeded via Prisma.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
