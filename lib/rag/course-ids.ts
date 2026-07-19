import { getNamasteCourse } from "@/lib/courses/namaste-courses";

/** Resolve course IDs for vector retrieval — bundles include child courses. */
export function resolveRetrievalCourseIds(courseId?: string): string[] | undefined {
  if (!courseId) return undefined;

  const course = getNamasteCourse(courseId);
  if (!course) return [courseId];

  const ids = new Set<string>([courseId]);
  if (course.bundleCourseIds) {
    for (const childId of course.bundleCourseIds) {
      ids.add(childId);
    }
  }

  return [...ids];
}
