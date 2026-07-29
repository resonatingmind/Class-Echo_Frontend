// import { useEffect, useState } from "react";
// import { ActivityIndicator, ScrollView, StyleSheet } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { useNavigation, useRoute } from "@react-navigation/native";

// import { colors } from "../theme/colors";
// import { useAuth } from "../context/AuthContext";

// import { PlannerSubjectDetail } from "../types/api";

// import { getPlannerSubjectDetail } from "../lib/api";

// import { PlannerDetailHeader } from "../components/plannerDetail/PlannerDetailHeader";

// import { PlannerStatistics } from "../components/plannerDetail/PlannerStatistics";

// import { PlannerChapterTable } from "../components/plannerDetail/PlannerChapterTable";

// export function SchoolAdminPlannerDetailScreen() {
//   const navigation = useNavigation<any>();

//   const route = useRoute<any>();

//   const { session } = useAuth();

//   const { subjectId } = route.params;

//   const [detail, setDetail] = useState<PlannerSubjectDetail | null>(null);

//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     loadDetail();
//   }, []);

//   async function loadDetail() {
//     if (!session?.token) return;

//     try {
//       setLoading(true);

//       const response = await getPlannerSubjectDetail(session.token, subjectId);

//       setDetail(response);
//     } catch (error) {
//       console.log(error);
//     } finally {
//       setLoading(false);
//     }
//   }

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.center}>
//         <ActivityIndicator size="large" color={colors.primary} />
//       </SafeAreaView>
//     );
//   }

//   if (!detail) return null;

//   return (
//     <SafeAreaView style={styles.container}>
//       <ScrollView contentContainerStyle={styles.content}>
//         <PlannerDetailHeader
//           subjectName={detail.subject_name}
//           className={detail.class_name}
//           teacherName={detail.teacher_name}
//           academicYear={detail.academic_year}
//           onBack={() => navigation.goBack()}
//         />

//         <PlannerStatistics statistics={detail.statistics} />

//         <PlannerChapterTable
//           chapters={detail.chapters}
//           onOpenDocuments={(chapter) => {
//             navigation.navigate("SchoolAdminChapterDetail", {
//               chapterId: chapter.id,
//               chapterName: chapter.name,
//               subjectName: detail.subject_name,
//             });
//           }}
//           onAddDocument={(chapter) => {
//             navigation.navigate("SchoolAdminChapterDetail", {
//               chapterId: chapter.id,
//               chapterName: chapter.name,
//               subjectName: detail.subject_name,
//               openUpload: true,
//             });
//           }}
//           onOpenRecordings={(chapter) => {
//             navigation.navigate("SchoolAdminTeacherRecordings", {
//               chapterId: chapter.id,
//               chapterName: chapter.name,
//               subjectName: detail.subject_name,
//             });
//           }}
//         />
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,

//     backgroundColor: colors.background,
//   },

//   content: {
//     padding: 20,

//     paddingBottom: 40,
//   },

//   center: {
//     flex: 1,

//     justifyContent: "center",

//     alignItems: "center",

//     backgroundColor: colors.background,
//   },
// });


import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";

import { colors } from "../theme/colors";
import { useAuth } from "../context/AuthContext";

import { PlannerSubjectDetail } from "../types/api";

import { getPlannerSubjectDetail } from "../lib/api";

import { PlannerDetailHeader } from "../components/plannerDetail/PlannerDetailHeader";

import { PlannerStatistics } from "../components/plannerDetail/PlannerStatistics";

import { PlannerChapterProgress } from "../components/plannerDetail/PlannerChapterProgress";

import { PlannerChapterTable } from "../components/plannerDetail/PlannerChapterTable";

export function SchoolAdminPlannerDetailScreen() {
  const navigation = useNavigation<any>();

  const route = useRoute<any>();

  const { session } = useAuth();

  const { subjectId } = route.params;

  const [detail, setDetail] = useState<PlannerSubjectDetail | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDetail();
  }, []);

  async function loadDetail() {
    if (!session?.token) return;

    try {
      setLoading(true);

      const response = await getPlannerSubjectDetail(session.token, subjectId);

      setDetail(response);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (!detail) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <PlannerDetailHeader
          subjectName={detail.subject_name}
          className={detail.class_name}
          teacherName={detail.teacher_name}
          academicYear={detail.academic_year}
          onBack={() => navigation.goBack()}
        />

        <PlannerStatistics statistics={detail.statistics} />

        <PlannerChapterProgress
          completed={
            detail.chapters.filter((chapter) => chapter.status === "Completed")
              .length
          }
          total={detail.chapters.length}
        />

        <PlannerChapterTable
          chapters={detail.chapters}
          subjectId={detail.subject_id}
          subjectName={detail.subject_name}
          onOpenDocuments={(chapter) => {
            navigation.navigate("SchoolAdminChapterDetail", {
              chapterId: chapter.id,
              chapterName: chapter.name,
              subjectName: detail.subject_name,
              subjectId: detail.subject_id,
            });
          }}
          onAddDocument={(chapter) => {
            navigation.navigate("SchoolAdminChapterDetail", {
              chapterId: chapter.id,
              chapterName: chapter.name,
              subjectName: detail.subject_name,
              subjectId: detail.subject_id,
              openUpload: true,
            });
          }}
          onOpenRecordings={(chapter) => {
            navigation.navigate("SchoolAdminTeacherRecordings", {
              chapterId: chapter.id,
              chapterName: chapter.name,
              subjectName: detail.subject_name,
            });
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor: colors.background,
  },

  content: {
    padding: 20,

    paddingBottom: 40,
  },

  center: {
    flex: 1,

    justifyContent: "center",

    alignItems: "center",

    backgroundColor: colors.background,
  },
});
