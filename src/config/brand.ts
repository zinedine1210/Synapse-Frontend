/**
 * 🧠 Synapse Brand Configuration
 * ────────────────────────────────
 * Ubah nilai di sini untuk rebranding instan tanpa menyentuh kode lain.
 * File ini adalah sumber kebenaran tunggal untuk semua teks identitas aplikasi.
 */
export const brand = {
  name: 'Synapse',
  tagline: 'Hubungkan pikiran, kuasai ilmu.',
  description:
    'Platform akademik berbasis AI untuk mahasiswa — rangkuman cerdas, kuis adaptif, dan manajemen kelas dalam satu dasbor.',
  logoText: 'SN', // Singkatan untuk fallback logo text
  logoPath: '/logo.png', // Path logo di folder public/
  version: '1.0.0',

  contact: {
    email: 'hello@synapse.dev',
    website: 'https://synapse.dev',
  },

  social: {
    instagram: 'https://instagram.com/synapseapp',
    twitter: 'https://twitter.com/synapseapp',
    github: 'https://github.com/synapseapp',
  },

  footer: {
    copyright: `© ${new Date().getFullYear()} Synapse. Dibuat dengan ❤️ untuk mahasiswa Indonesia.`,
  },
} as const;
