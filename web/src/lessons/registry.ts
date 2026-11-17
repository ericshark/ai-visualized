import { aiRequestLesson } from "./ai-request/lesson";
import type { Lesson } from "./types";

/** Lessons by id. Adding a lesson means adding an entry here. */
export const lessons: Record<string, Lesson> = {
  [aiRequestLesson.id]: aiRequestLesson,
};

export const defaultLesson = aiRequestLesson;
