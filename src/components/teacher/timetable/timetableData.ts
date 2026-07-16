export type TimetablePeriod = {
  id: string;
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
  period: number;
  startTime: string;
  endTime: string;
  className: string;
  section: string;
  subject: string;
  room: string;
};

export const MOCK_TIMETABLE: TimetablePeriod[] = [
  {
    id: "1",
    day: "Monday",
    period: 1,
    startTime: "08:00",
    endTime: "08:45",
    className: "Class 10",
    section: "A",
    subject: "Mathematics",
    room: "203",
  },
  {
    id: "2",
    day: "Monday",
    period: 2,
    startTime: "09:00",
    endTime: "09:45",
    className: "Class 11",
    section: "A",
    subject: "Physics",
    room: "105",
  },
];
