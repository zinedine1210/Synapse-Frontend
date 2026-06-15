/**
 * 🧠 Synapse Brand Configuration
 * ────────────────────────────────
 * Ubah nilai di sini untuk rebranding instan tanpa menyentuh kode lain.
 * File ini adalah sumber kebenaran tunggal untuk semua teks identitas aplikasi.
 */
export const brand = {
  name: 'Synapse',
  tagline: 'Belajar makin gampang, hidup makin teratur. ⚡',
  description:
    'Platform produktivitas berbasis AI buat anak muda — rangkuman cerdas, kuis adaptif, & manajemen kelas dalam satu app.',
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
    copyright: `© ${new Date().getFullYear()} Synapse. Dibuat dengan ❤️ untuk anak muda Indonesia.`,
  },
} as const;
