export const INITIAL_TRAININGS = [
  {
    id: 1,
    title: "Кроссфит / Интенсив",
    trainer: "Алексей Смирнов",
    time: "10:00 - 11:30",
    day: "Пн, 20",
    category: "Силовая",
    status: "OPEN", 
    availableSlots: 4,
    maxSlots: 10,
  },
  {
    id: 2,
    title: "Йога & Стретчинг",
    trainer: "Елена Васильева",
    time: "12:00 - 13:00",
    day: "Пн, 20",
    category: "Восстановление",
    status: "FEW_SLOTS",
    availableSlots: 1,
    maxSlots: 8,
  },
  {
    id: 3,
    title: "Персональный бокс",
    trainer: "Дмитрий Мельников",
    time: "15:00 - 16:30",
    day: "Вт, 21",
    category: "Единоборства",
    status: "FULL",
    availableSlots: 0,
    maxSlots: 6,
  },
  {
    id: 4,
    title: "Пилатес Реформер",
    trainer: "Анна Громова",
    time: "17:00 - 18:00",
    day: "Вт, 21",
    category: "Восстановление",
    status: "OPEN",
    availableSlots: 5,
    maxSlots: 8,
  }
];

export const STATS_DATA = {
  overallProgress: 68, 
  activeClients: 142,
  todayClasses: 8,
};