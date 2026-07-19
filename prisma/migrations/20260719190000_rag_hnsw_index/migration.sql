CREATE INDEX IF NOT EXISTS "interview_questions_embedding_hnsw_idx"
  ON "interview_questions" USING hnsw ("embedding" vector_cosine_ops);

CREATE INDEX IF NOT EXISTS "interview_questions_metadata_course_id_idx"
  ON "interview_questions" ((metadata->>'courseId'));
