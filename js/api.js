(() => {
  "use strict";

  const LOOKUPS = {
    statuses: { done: "منتهي", progress: "قيد الإنجاز", rejected: "مرفوض" },
    licenseTypes: { building: "رخصة بناء", renovation: "رخصة ترميم" },
    entryTypes: { commercial: "تجاري", residential: "سكني" },
    landfills: {
      landfill_1: "دوما",
      landfill_2: "التل",
      landfill_3: "الهامة",
      landfill_4: "السليمة",
      landfill_5: "حفير التحتا"
    },
    entities: {
      water_company: "شركة المياه",
      electricity_company: "شركة الكهرباء",
      telephone_company: "شركة الهاتف",
      sanitation_company: "شركة الصرف الصحي",
      other: "غير ذلك"
    },
    materials: {
      iron: "حديد",
      cement: "اسمنت",
      block: "بلوك",
      wood: "خشب",
      concrete: "باطون",
      sand_gravel: "بحص ورمل"
    }
  };

  const TEST_DATA = [
    {
      type: "transport",
      status: "done",
      submitted_at: "2026-09-15T08:12:11+03:00",
      license_type: "building"
    },
    {
      type: "rubble",
      status: "rejected",
      submitted_at: "2026-09-21T17:45:00+03:00",
      landfill: "landfill_3"
    },
    {
      type: "excavation",
      status: "progress",
      submitted_at: "2026-09-26T08:30:00+03:00",
      excavation_applicant: "water_company"
    },
    {
      type: "distributor",
      status: "done",
      submitted_at: "2026-09-24T07:20:00+03:00",
      materials: ["cement", "iron"]
    },
    {
      type: "vehicle_enter",
      status: "done",
      submitted_at: "2026-09-25T09:40:00+03:00",
      entry_type: "commercial"
    }
  ];

  async function testLicenseDashboard(period) {
    return TEST_DATA;
  }

  const licenseDashboard = window.licenseDashboard || testLicenseDashboard;

  function toKey(dictionary, value) {
    if (!value) return null;
    if (dictionary[value]) return value;
    return Object.keys(dictionary).find((key) => dictionary[key] === value) || value;
  }

  function normalizePermit(item, index) {
    const submittedAt = new Date(item.submitted_at);
    return {
      id: index,
      type: item.type,
      status: LOOKUPS.statuses[item.status] ? item.status : "progress",
      submittedAt: Number.isNaN(submittedAt.getTime()) ? null : submittedAt,
      licenseType: toKey(LOOKUPS.licenseTypes, item.license_type),
      entryType: toKey(LOOKUPS.entryTypes, item.entry_type),
      landfill: toKey(LOOKUPS.landfills, item.landfill),
      entity: toKey(LOOKUPS.entities, item.excavation_applicant),
      materials: (item.materials || []).map((material) => toKey(LOOKUPS.materials, material))
    };
  }

  async function getPermits(type, period) {
    const data = await licenseDashboard(period);
    return data.map(normalizePermit).filter((permit) => permit.type === type);
  }

  window.TasreehApi = {
    lookups: LOOKUPS,
    getPermits
  };
})();
