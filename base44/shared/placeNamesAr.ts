// Arabic names for the places used in routes (keys normalized: lowercase,
// underscores/spaces removed). Unknown places fall back to the English label.
const PLACES_AR = {
  madina: "المدينة المنورة",
  madinah: "المدينة المنورة",
  medina: "المدينة المنورة",
  makkah: "مكة المكرمة",
  mecca: "مكة المكرمة",
  riyadh: "الرياض",
  dammam: "الدمام",
  jeddah: "جدة",
  alqasim: "القصيم",
  qasim: "القصيم",
  zalim: "ظلم",
  tayab: "الطائف",
  taif: "الطائف",
  ramazia: "الرمزية",
  alhanakiyyah: "الحناكية",
  hanakiyyah: "الحناكية",
  alhumiyat: "الحميات",
  humiyat: "الحميات",
  riswan: "رضوان",
  ajdarmilanairport: "مطار أجدار ميلان",
  ruwaydah: "الرويضة",
  buraidah: "بريدة",
  badar: "بدر",
  badr: "بدر"
};

export function placeNameAr(name) {
  const key = String(name || "").toLowerCase().replace(/[\s_\-]/g, "");
  return PLACES_AR[key] || String(name || "").replace(/_/g, " ");
}