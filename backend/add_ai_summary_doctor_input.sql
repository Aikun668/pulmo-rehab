-- Add doctor_input column to ai_summaries table
-- doctor_input stores the mandatory key recommendations provided by the doctor before AI generation
ALTER TABLE ai_summaries
ADD COLUMN doctor_input TEXT NOT NULL DEFAULT '';
