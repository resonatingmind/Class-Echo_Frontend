import { useEffect, useState } from "react";

import { lookupTeacher } from "../lib/api";

import { TeacherLookupOut } from "../types/api";

export function useTeacherLookup(token: string, email: string) {
  const [loading, setLoading] = useState(false);

  const [teacherExists, setTeacherExists] = useState<boolean | null>(null);

  const [teacher, setTeacher] = useState<TeacherLookupOut | null>(null);

  useEffect(() => {
    if (!email.trim()) {
      setTeacherExists(null);
      setTeacher(null);
      return;
    }

    const timer = setTimeout(() => {
      lookup();
    }, 500);

    return () => clearTimeout(timer);
  }, [email]);

  async function lookup() {
    try {
      setLoading(true);

      const data = await lookupTeacher(token, email);

      setTeacher(data);

      setTeacherExists(data.exists);
    } catch (error) {
      console.log("Teacher lookup error:", error);

      setTeacherExists(null);
      setTeacher(null);
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    teacherExists,
    teacher,
  };
}
