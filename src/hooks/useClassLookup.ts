import { useEffect, useState } from "react";

import { lookupClass } from "../lib/api";
import { ClassLookupOut } from "../types/api";

export function useClassLookup(
  token: string,
  className: string,
  section: string,
) {
  const [loading, setLoading] = useState(false);

  const [classExists, setClassExists] = useState<boolean | null>(null);

  const [classData, setClassData] = useState<ClassLookupOut | null>(null);

  useEffect(() => {
    const name = className.trim();
    const sec = section.trim().toUpperCase();

    // Don't search until both values are entered
    if (!name || !sec) {
      setClassExists(null);
      setClassData(null);
      return;
    }

    const timer = setTimeout(() => {
      lookup(name, sec);
    }, 500);

    return () => clearTimeout(timer);
  }, [className, section]);

  async function lookup(name: string, sec: string) {
    try {
      setLoading(true);

      const data = await lookupClass(token, name, sec);

      setClassData(data);
      setClassExists(data.exists);
    } catch (error) {
      console.log("Class lookup failed:", error);

      setClassExists(null);
      setClassData(null);
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    classExists,
    classData,
  };
}
