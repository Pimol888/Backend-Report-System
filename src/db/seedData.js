const SAMPLE_REPORT_DESCRIPTION =
  "របាយការណ៍នេះសង្ខេបលទ្ធផលប្រតិបត្តិការ និងសកម្មភាពសំខាន់ៗក្នុងរយៈពេលដែលបានជ្រើសរើស។ ឯកសារភ្ជាប់មានទម្រង់ PDF និង Word សម្រាប់អនុម័ត និងរក្សាទុកក្នុងប្រព័ន្ធ។";

const TEAM_MEMBERS = [
  { id: "1", name: "លោក ហេង ហ៊ុយឡុង", role: "អ្នកគ្រប់គ្រងគម្រោង", initials: "ហហ" },
  { id: "2", name: "អ្នកស្រី សុខ ពិសិដ្ឋ", role: "អ្នករចនា UI", initials: "សព" },
  { id: "3", name: "លោក ចាន់ វិច្ឆិកា", role: "អ្នកអភិវឌ្ឍន៍ប្រព័ន្ធ", initials: "ចវ" },
  { id: "4", name: "អ្នកស្រី ម៉ារី សុខា", role: "អ្នកធ្វើតេស្តប្រព័ន្ធ", initials: "មស" },
  { id: "5", name: "លោក ពៅ សុភាព", role: "អ្នកគ្រប់គ្រងទិន្នន័យ", initials: "ពស" },
  { id: "6", name: "អ្នកស្រី លីណា ចន្ទ្រា", role: "អ្នកជំនាញសន្តិសុខព័ត៌មាន", initials: "លច" },
  { id: "7", name: "លោក សំរាប់ បញ្ញា", role: "អ្នកគ្រប់គ្រងផលិតផល", initials: "សប" },
  { id: "8", name: "អ្នកស្រី រតនា សុខុម", role: "អ្នកប្រឹក្សាបច្ចេកទេស", initials: "រស" },
  { id: "9", name: "លោក វិចិត្រ សារុន", role: "អ្នកជំនាញហេដ្ឋារចនាបណ្តាញ", initials: "វស" },
  { id: "10", name: "អ្នកស្រី ប៊ុនធីតា ម៉ុន", role: "អ្នកគ្រប់គ្រងគោលការណ៍វិភាគ", initials: "បម" },
  { id: "11", name: "លោក សុខា រស្មី", role: "អ្នកប្រតិបត្តិប្រព័ន្ធ", initials: "សរ" },
  { id: "12", name: "អ្នកស្រី ចន្ទ្រា ស៊ុន", role: "អ្នកសរសេរឯកសារបច្ចេកទេស", initials: "ចស" },
];

const GENERAL_DIRECTORATES = [
  {
    id: "gd-admin-tech",
    name: "អគ្គនាយកដ្ឋានរដ្ឋបាល និងបច្ចេកវិទ្យា",
    departments: [
      {
        id: "dept-digital",
        name: "នាយកដ្ឋានបច្ចេកវិទ្យា និងឌីជីថល",
        submitterNames: [TEAM_MEMBERS[0].name, TEAM_MEMBERS[1].name, TEAM_MEMBERS[2].name],
      },
      {
        id: "dept-ops",
        name: "នាយកដ្ឋានប្រតិបត្តិ និងគាំទ្របច្ចេកទេស",
        submitterNames: [TEAM_MEMBERS[3].name, TEAM_MEMBERS[4].name, TEAM_MEMBERS[5].name],
      },
    ],
  },
  {
    id: "gd-policy-info",
    name: "អគ្គនាយកដ្ឋានគោលការណ៍ និងព័ត៌មាន",
    departments: [
      {
        id: "dept-governance",
        name: "នាយកដ្ឋានគោលការណ៍ និងគ្រប់គ្រងគុណភាព",
        submitterNames: [TEAM_MEMBERS[6].name, TEAM_MEMBERS[7].name, TEAM_MEMBERS[8].name],
      },
      {
        id: "dept-docs",
        name: "នាយកដ្ឋានឯកសារ និងព័ត៌មានវិទ្យា",
        submitterNames: [TEAM_MEMBERS[9].name, TEAM_MEMBERS[10].name, TEAM_MEMBERS[11].name],
      },
    ],
  },
];

const DEPARTMENTS = GENERAL_DIRECTORATES.flatMap((g) =>
  g.departments.map((d) => ({
    ...d,
    generalDirectorateId: g.id,
    generalDirectorateName: g.name,
  })),
);

const REPORT_SEED_ROWS = [
  { id: "1", documentTitle: "របាយការណ៍ប្រតិបត្តិការហិរញ្ញវត្ថុ ខែវិច្ឆិកា ២០២៥", fileSummary: "PDF + Word · 2.4 MB", cycle: "monthly", submittedAtLabel: "Nov 12, 2025 · 10:42", status: "reviewed", fileCount: 2, description: SAMPLE_REPORT_DESCRIPTION },
  { id: "2", documentTitle: "របាយការណ៍សង្ខេបធនធានមនុស្ស ត្រីមាសទី ៣ ឆ្នាំ ២០២៥", fileSummary: "PDF · 1.1 MB", cycle: "quarterly", submittedAtLabel: "Oct 28, 2025 · 14:05", status: "pending", fileCount: 1 },
  { id: "3", documentTitle: "របាយការណ៍ពិនិត្យឡើងវិញពាក់ព័ន្ធរដ្ឋបាលឆមាស", fileSummary: "Word · 890 KB", cycle: "semiannual", submittedAtLabel: "Sep 3, 2025 · 09:18", status: "reviewed", fileCount: 1, description: SAMPLE_REPORT_DESCRIPTION },
  { id: "4", documentTitle: "របាយការណ៍អនុលោមតាមប្រព័ន្ធរដ្ឋបាលប្រចាំឆ្នាំ ២០២៤", fileSummary: "PDF + Word · 4.2 MB", cycle: "yearly", submittedAtLabel: "Aug 19, 2025 · 16:30", status: "pending", fileCount: 2 },
  { id: "5", documentTitle: "របាយការណ៍លម្អិតចំណូល-ចំណាយ ខែតុលា ២០២៥", fileSummary: "PDF · 1.8 MB", cycle: "monthly", submittedAtLabel: "Nov 5, 2025 · 08:15", status: "reviewed", fileCount: 1, description: SAMPLE_REPORT_DESCRIPTION },
  { id: "6", documentTitle: "របាយការណ៍គម្រោងវិនិយោគ ត្រីមាសទី ២ ឆ្នាំ ២០២៥", fileSummary: "PDF + Word · 3.1 MB", cycle: "quarterly", submittedAtLabel: "Oct 15, 2025 · 11:22", status: "reviewed", fileCount: 2 },
  { id: "7", documentTitle: "របាយការណ៍សកម្មភាពទីស្នាក់ការ ខែកញ្ញា ២០២៥", fileSummary: "Word · 720 KB", cycle: "monthly", submittedAtLabel: "Oct 2, 2025 · 15:40", status: "pending", fileCount: 1, description: SAMPLE_REPORT_DESCRIPTION },
  { id: "8", documentTitle: "របាយការណ៍តាមដានអនុវត្តគោលនយោបាយរដ្ឋបាល ឆមាសទី ២", fileSummary: "PDF + Word · 2.0 MB", cycle: "semiannual", submittedAtLabel: "Sep 20, 2025 · 10:00", status: "reviewed", fileCount: 3 },
  { id: "9", documentTitle: "របាយការណ៍សម្រេចការងារប្រចាំឆ្នាំ ២០២៣", fileSummary: "PDF · 5.4 MB", cycle: "yearly", submittedAtLabel: "Sep 1, 2025 · 13:55", status: "reviewed", fileCount: 2, description: SAMPLE_REPORT_DESCRIPTION },
  { id: "10", documentTitle: "របាយការណ៍គណនេយ្យភាពហិរញ្ញវត្ថុ ខែសីហា ២០២៥", fileSummary: "Word · 1.2 MB", cycle: "monthly", submittedAtLabel: "Aug 30, 2025 · 09:30", status: "pending", fileCount: 1 },
  { id: "11", documentTitle: "របាយការណ៍អនុលោមតាមច្បាប់និងលិខិតបញ្ជូន ត្រីមាសទី ១", fileSummary: "PDF + Word · 1.6 MB", cycle: "quarterly", submittedAtLabel: "Aug 12, 2025 · 16:18", status: "reviewed", fileCount: 2, description: SAMPLE_REPORT_DESCRIPTION },
  { id: "12", documentTitle: "របាយការណ៍បច្ចេកទេសព័ត៌មានវិទ្យា ខែកក្កដា ២០២៥", fileSummary: "PDF · 990 KB", cycle: "monthly", submittedAtLabel: "Jul 28, 2025 · 14:02", status: "pending", fileCount: 1 },
  { id: "13", documentTitle: "របាយការណ៍សុវត្តិភាពយានយន្ត និងប្រើប្រាស់ប្រេង ឆមាសទី ១", fileSummary: "PDF + Word · 2.8 MB", cycle: "semiannual", submittedAtLabel: "Jul 10, 2025 · 08:45", status: "reviewed", fileCount: 2, description: SAMPLE_REPORT_DESCRIPTION },
  { id: "14", documentTitle: "របាយការណ៍ថែទាំនិងអាជីវកម្មរក្សាសំណង់ ប្រចាំឆ្នាំ ២០២៤", fileSummary: "Word · 2.2 MB", cycle: "yearly", submittedAtLabel: "Jun 25, 2025 · 11:10", status: "pending", fileCount: 1 },
  { id: "15", documentTitle: "របាយការណ៍អធិការកិច្ចខាងក្នុង ខែមេសា ២០២៥", fileSummary: "PDF · 640 KB", cycle: "monthly", submittedAtLabel: "May 8, 2025 · 13:25", status: "reviewed", fileCount: 2, description: SAMPLE_REPORT_DESCRIPTION },
  { id: "16", documentTitle: "របាយការណ៍រក្សាការប្រាក់និងថវិការប្រចាំត្រីមាស ពាក់កណ្តាលឆ្នាំ", fileSummary: "PDF + Word · 3.5 MB", cycle: "quarterly", submittedAtLabel: "Apr 22, 2025 · 10:50", status: "reviewed", fileCount: 3 },
  { id: "17", documentTitle: "របាយការណ៍ផែនការការងារខែមិថុនា ២០២៥", fileSummary: "Word · 510 KB", cycle: "monthly", submittedAtLabel: "Mar 14, 2025 · 15:05", status: "pending", fileCount: 1, description: SAMPLE_REPORT_DESCRIPTION },
  { id: "18", documentTitle: "របាយការណ៍វិនិយោគសហគមន៍ និងគម្រោងរដ្ឋបាល ឆមាសទី ២", fileSummary: "PDF · 4.0 MB", cycle: "semiannual", submittedAtLabel: "Feb 3, 2025 · 09:20", status: "pending", fileCount: 2 },
  { id: "19", documentTitle: "របាយការណ៍អនុវត្តការបោះឆ្នោតនិងអាជ្ញាធរជ្រើសរើស ឆ្នាំ ២០២៤", fileSummary: "PDF + Word · 2.6 MB", cycle: "yearly", submittedAtLabel: "Jan 18, 2025 · 12:40", status: "reviewed", fileCount: 2, description: SAMPLE_REPORT_DESCRIPTION },
  { id: "20", documentTitle: "របាយការណ៍ធនធានទឹកនិងជល់សារធាណ៍ ខែធ្នូ ២០២៤", fileSummary: "PDF · 1.4 MB", cycle: "monthly", submittedAtLabel: "Dec 9, 2024 · 08:55", status: "reviewed", fileCount: 1 },
];

const ADMIN_NOTES_SEED = {
  "2": [{ text: "សូមដាក់ស្នើឯកសារ PDF និង Word កំណែធ្វើបច្ចុប្បន្នភាពឡើងវិញ។", author: "សុំ ចិន្តា", timeLabel: "14:20 ថ្ងៃនេះ", kind: "request-files" }],
  "4": [{ text: "ឯកសារ Word មិនគ្រប់គ្រាន់ — សូមភ្ជាប់ទំព័រខុសគ្នា និង PDF សង្ខេប។", author: "សុំ ចិន្តា", timeLabel: "09:05 ថ្ងៃនេះ", kind: "request-files" }],
  "1": [{ text: "របាយការណ៍ត្រូវបានពិនិត្យ និងអនុម័តរួចរាល់។ សូមរក្សាទម្រង់ PDF/Word និងពេលវេលាដាក់ស្នើឱ្យដូចគ្នាសម្រាប់រយៈពេលបន្ទាប់។", author: "សុំ ចិន្តា", timeLabel: "14:08 ថ្ងៃនេះ", kind: "comment" }],
};

const USERS_SEED = [
  { id: "u-admin", email: "admin", password: "admin", role: "admin", name: "សុំ ចិន្តា", departmentId: "dept-digital", courtesyName: "លោកស្រី", phone: "+855 12 111 222" },
  { id: "u-superadmin", email: "superadmin", password: "superadmin", role: "superadmin", name: "អ្នកគ្រប់គ្រងប្រព័ន្ធ", departmentId: null, courtesyName: "លោក", phone: "+855 12 222 333" },
];

module.exports = {
  ADMIN_NOTES_SEED,
  DEPARTMENTS,
  GENERAL_DIRECTORATES,
  REPORT_SEED_ROWS,
  TEAM_MEMBERS,
  USERS_SEED,
};
