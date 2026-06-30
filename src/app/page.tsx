'use client';

import Image from 'next/image';
import Link from 'next/link';
import { brand } from '@/config/brand';
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles, Brain, FileText, Users, BarChart3,
  ChevronRight, Zap, MessageSquare, ArrowRight, Star,
  CheckCircle2, GraduationCap, Layers, Target, Sun, Moon, Globe,
  Shield, Wallet, ClipboardList, PenTool, Bell,
  FolderOpen, ChevronDown, Play, Smartphone,
} from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

/* ═══════════════════════════════════════════
   i18n
   ═══════════════════════════════════════════ */
type Lang = 'id' | 'en';
const T = {
  id: {
    badge: 'Platform Akademik Berbasis AI #1 di Indonesia',
    heroTitle1: 'Revolusi Cara',
    heroTitle2: 'Anak Muda Belajar',
    heroTitle3: 'dengan AI',
    heroDesc: 'Rangkum materi dalam detik, kuis adaptif, prediksi ujian, tracker keuangan + AI coach, rekomendasi makan, split bill, virtual pet — semua dalam satu app yang didesain untuk anak muda.',
    ctaPrimary: 'Mulai Gratis Sekarang',
    ctaSecondary: 'Lihat Demo',
    ctaTertiary: 'Pelajari Fitur',
    proofFree: 'Gratis selamanya',
    proofNoCC: 'Tanpa kartu kredit',
    proofAI: 'Powered by Gemini AI',
    proofSetup: 'Setup 30 detik',
    scroll: 'Jelajahi',
    navLogin: 'Masuk',
    navRegister: 'Daftar Gratis',
    navFeatures: 'Fitur',
    navHowItWorks: 'Cara Kerja',
    navTestimonials: 'Testimoni',

    // Stats
    statSessions: 'Sesi Pertemuan',
    statSessionsSub: 'per kelas',
    statFeatures: 'Fitur Unggulan',
    statFeaturesSub: 'dalam satu platform',
    statAccuracy: 'Akurasi AI',
    statAccuracySub: 'untuk rangkuman',
    statFaster: 'Lebih Cepat',
    statFasterSub: 'dari cara manual',

    // Highlight section
    highlightBadge: 'Kenapa Synapse?',
    highlightTitle1: 'Satu Platform,',
    highlightTitle2: 'Semua Kebutuhanmu',
    highlightSub: 'Tidak perlu lagi berpindah-pindah aplikasi. Synapse menyatukan semua yang kamu butuhkan untuk kuliah dalam satu dasbor yang elegan.',
    highlights: [
      { title: 'AI yang Benar-Benar Paham Kamu', desc: 'Bukan sekadar chatbot. AI kami rangkum materi, prediksi ujian, rekomendasiin makanan, jadi coach keuangan, dan bahkan jawab Q&A — semua personalized.', icon: 'brain' },
      { title: 'All-in-One Life Platform', desc: 'Kuliah, keuangan, makan, to-do, split bill — semua dalam satu app. Gak perlu lagi install 10 aplikasi berbeda untuk hidup produktif.', icon: 'users' },
      { title: 'Gamifikasi yang Bikin Nagih', desc: 'Virtual pet, streak calendar, XP & level-up, leaderboard, achievement badges, dan quiz keuangan. Belajar & produktif jadi seru kayak main game.', icon: 'folder' },
    ],

    // Features
    featBadge: 'Fitur Lengkap',
    featTitle1: 'Semua yang Kamu Butuhkan',
    featTitle2: 'untuk Hidup Produktif',
    featSub: 'Bukan cuma buat kuliah — Synapse bantu semua aspek kehidupan anak muda Indonesia.',
    features: [
      { title: 'AI Summarizer', desc: 'Upload PDF atau gambar materi kuliah, AI bikin rangkuman cerdas dengan poin-poin utama dalam hitungan detik. Hemat berjam-jam waktu belajar.', tag: 'AI' },
      { title: 'Kuis Adaptif', desc: 'AI analisis kelemahanmu dari kuis sebelumnya dan bikin soal yang tepat sasaran. Makin sering latihan, makin pintar AI-nya.', tag: 'AI' },
      { title: 'Prediksi Ujian + Kisi-kisi', desc: 'AI prediksi soal yang bakal keluar di ujian berdasarkan seluruh materi. Bisa juga upload kisi-kisi buat hasil lebih akurat.', tag: 'AI' },
      { title: 'Daily Briefing & AI Insight', desc: 'Tiap pagi dapat briefing personal — deadline hari ini, tips belajar, dan insight AI tentang pola belajarmu. Auto-motivasi!', tag: 'AI' },
      { title: 'Duit Tracker', desc: 'Catat pemasukan & pengeluaran, kelola tagihan, hutang-piutang, budget bulanan, saving tree, wishlist, bahkan financial challenges.', tag: 'Keuangan' },
      { title: 'Si Bawel (AI Coach)', desc: 'AI financial coach yang inget kebiasaan finansialmu. Dia bakal "ngomel" kalau kamu boros dan kasih tips personalized. Punya memory!', tag: 'Keuangan' },
      { title: 'Makan Apa (AI Food Rec)', desc: 'Bingung mau makan apa? AI rekomendasiin makanan berdasarkan budget, lokasi, preferensi diet, dan mood kamu hari ini.', tag: 'Lifestyle' },
      { title: 'Split Bill & Receipt Scanner', desc: 'Scan struk belanja langsung pakai kamera, AI otomatis bagi-bagi biaya. Gak perlu lagi hitung manual pas makan bareng.', tag: 'Keuangan' },
      { title: 'Forum Diskusi Real-time', desc: 'Ruang diskusi per kelas dengan thread terpisah, voting, rich text editor, canvas kolaboratif, dan indikator pesan baru.', tag: 'Sosial' },
      { title: 'To-Do List Pro', desc: 'Bukan to-do biasa — ada calendar view, timeline, subtasks, recurring tasks, kategori, dan AI parsing. Produktivitas next-level.', tag: 'Produktivitas' },
      { title: 'Virtual Pet & Gamifikasi', desc: 'Pelihara pixel pet yang tumbuh sesuai produktivitasmu! Streak calendar, XP, level-up, leaderboard, dan achievement badges.', tag: 'Lifestyle' },
      { title: 'Q&A Forum + AI Answer', desc: 'Tanya apa aja di Q&A publik, voting jawaban terbaik, atau minta AI jawab langsung. Reputasi naik tiap jawaban kamu di-upvote.', tag: 'Sosial' },
      { title: 'Kelompok & Kas Kolektif', desc: 'Bikin kelompok belajar, bagi tugas per anggota, dan kelola kas kelas secara transparan. Semua anggota bisa lihat histori.', tag: 'Tim' },
      { title: 'Quiz Keuangan', desc: 'Tes literasi keuanganmu lewat quiz interaktif. Belajar financial planning sambil main — cocok buat pemula.', tag: 'Keuangan' },
      { title: 'What-If Calculator', desc: 'Simulasi skenario keuangan — "kalau aku nabung 500rb/bulan, kapan bisa beli laptop?" AI hitung dan visualisasiin hasilnya.', tag: 'Keuangan' },
      { title: 'Profile Card & Command Palette', desc: 'Kartu profil digital yang bisa di-share, plus command palette (Ctrl+K) untuk akses fitur apapun super cepat. Power user vibes.', tag: 'Produktivitas' },
    ],

    // How it works
    howBadge: 'Cara Kerja',
    howTitle1: 'Empat Langkah Menuju',
    howTitle2: 'Nilai Sempurna',
    howSub: 'Mulai dari nol hingga siap ujian — semuanya bisa dilakukan dalam hitungan menit.',
    steps: [
      { num: '01', title: 'Daftar 30 Detik', desc: 'Sign up gratis pakai email atau Google. Langsung bisa akses semua fitur dasar — kelas, duit tracker, to-do, virtual pet, dan lainnya.', detail: 'Tanpa kartu kredit' },
      { num: '02', title: 'Setup Hidupmu', desc: 'Gabung atau buat kelas, set budget keuangan, atur to-do list, dan kenalan sama Si Bawel — AI coach yang bakal jadi temen curhatmu.', detail: 'Personalized setup' },
      { num: '03', title: 'AI Bantu Semuanya', desc: 'Upload materi — AI rangkum. Bingung makan — AI rekomendasiin. Boros — Si Bawel ngomel. Mau ujian — AI prediksi soal. Semua otomatis.', detail: 'Powered by Gemini' },
      { num: '04', title: 'Level Up Terus', desc: 'Streak naik, pet tumbuh, XP nambah, leaderboard naik. Semakin produktif, semakin seru. Kuliah & hidup jadi kayak main game!', detail: 'Gamifikasi penuh' },
    ],

    // Video demo
    videoBadge: 'Lihat Aksi',
    videoTitle1: 'Saksikan Synapse',
    videoTitle2: 'Beraksi',
    videoSub: 'Lihat bagaimana pengguna Synapse meringkas materi, latihan kuis, dan kolaborasi — semuanya dalam hitungan menit.',
    videoPlayBtn: 'Tonton Demo',

    // Showcase section
    showcaseBadge: 'Tampilan Aplikasi',
    showcaseTitle1: 'Dirancang untuk',
    showcaseTitle2: 'Generasi Modern',
    showcaseSub: 'Interface yang bersih, responsif, dan mendukung dark mode. Semua fitur bisa diakses dalam hitungan klik.',
    showcaseItems: [
      { title: 'Dashboard All-in-One', desc: 'Kelas, deadline, keuangan, dan aktivitas terbaru — semua terlihat dalam satu halaman.' },
      { title: 'Duit Tracker + Si Bawel', desc: 'Catat keuangan, budget, dan terima "omelan" AI coach yang tau kebiasaanmu.' },
      { title: 'AI Food & Split Bill', desc: 'Rekomendasi makan sesuai budget, scan struk, dan bagi biaya otomatis.' },
      { title: 'Virtual Pet & Gamifikasi', desc: 'Pixel pet yang tumbuh sesuai produktivitas, leaderboard, dan achievement.' },
    ],

    // Testimonials
    testiBadge: 'Testimoni',
    testiTitle1: 'Dicintai Pengguna',
    testiTitle2: 'di Seluruh Indonesia',
    testiSub: 'Lihat apa kata mereka yang sudah merasakan kemudahan belajar dengan Synapse.',
    testimonials: [
      { name: 'Rina Salsabila', major: 'Manajemen — Universitas Indonesia', text: 'Synapse bikin rangkuman materi jadi cepat banget! Dulu aku butuh 2-3 jam buat bikin catatan, sekarang AI-nya bisa dalam hitungan detik. Plus fitur export PDF-nya keren, bisa langsung cetak buat UAS.', avatar: 'R', rating: 5 },
      { name: 'Andi Pratama', major: 'Teknik Informatika — ITB', text: 'Fitur kuis adaptif-nya luar biasa. AI-nya tau persis mana yang aku kurang paham dan terus kasih soal di topik itu sampai aku benar-benar mengerti. Nilai UTS naik drastis!', avatar: 'A', rating: 5 },
      { name: 'Maya Lestari', major: 'Akuntansi — Binus University', text: 'Forum diskusinya lengkap banget — bisa bikin thread terpisah per topik, ada voting, bahkan canvas buat notulen. Gak perlu lagi buat grup WhatsApp untuk setiap mata kuliah.', avatar: 'M', rating: 5 },
      { name: 'Dimas Arya', major: 'Hukum — Universitas Gadjah Mada', text: 'Prediksi ujian-nya surprisingly accurate. 7 dari 10 soal yang diprediksi AI beneran keluar di UAS. Ini game changer buat persiapan ujian!', avatar: 'D', rating: 5 },
      { name: 'Sari Dewi', major: 'Kedokteran — Unair', text: 'Materi kuliah kami sangat banyak. Synapse bikin review materi jadi structured dan efisien. Fitur kelompoknya juga membantu buat PBL.', avatar: 'S', rating: 5 },
      { name: 'Rizky Fauzan', major: 'Sistem Informasi — UGM', text: 'Kas kolektif-nya berguna banget buat kelola uang kas kelas. Transparan, semua bisa lihat, dan gak perlu spreadsheet terpisah lagi. Manajemen tugas-nya juga oke.', avatar: 'F', rating: 5 },
    ],

    // FAQ
    faqBadge: 'FAQ',
    faqTitle1: 'Pertanyaan',
    faqTitle2: 'yang Sering Ditanyakan',
    faqs: [
      { q: 'Apakah Synapse benar-benar gratis?', a: 'Ya! Paket Newbie gratis selama 7 hari trial — kelas, forum, duit tracker, to-do list, virtual pet, dan 20 AI request/hari. Upgrade ke Hustler (Rp 24.900) atau Full Power (Rp 39.900) untuk fitur lengkap & limit lebih besar.' },
      { q: 'AI-nya menggunakan model apa?', a: 'Synapse pakai Google Gemini AI (gemini-2.0-flash) yang udah dioptimasi khusus untuk konten akademik dan keuangan berbahasa Indonesia.' },
      { q: 'Fitur keuangan seperti apa?', a: 'Lengkap banget — catat pemasukan/pengeluaran, tagihan, hutang-piutang, budget, saving tree, wishlist, financial challenges, split bill, scan struk, dan Si Bawel (AI coach yang inget kebiasaanmu).' },
      { q: 'Bisa digunakan untuk jurusan apa saja?', a: 'Synapse dirancang untuk semua jurusan. Fitur akademik (AI summarizer, kuis, prediksi) support semua bidang. Fitur lifestyle (duit, makan, to-do) bisa dipakai siapa aja.' },
      { q: 'Apakah data saya aman?', a: 'Tentu! Semua data terenkripsi di Supabase. File hanya bisa diakses anggota kelas. Data keuangan bersifat pribadi dan tidak bisa dilihat orang lain.' },
      { q: 'Apakah bisa diakses dari HP?', a: 'Ya, Synapse fully responsive dan bisa di-install sebagai PWA (Progressive Web App) di HP. Rasanya kayak native app tanpa perlu download dari store.' },
    ],

    // CTA
    ctaTitle1: 'Siap Revolusi',
    ctaTitle2: 'Cara Belajarmu?',
    ctaDesc: 'Bergabung dengan ribuan anak muda yang sudah merasakan kemudahan belajar dengan AI. Gratis, tanpa batas waktu, tanpa kartu kredit.',
    ctaBtn: 'Mulai Gratis Sekarang',
    ctaNote: 'Gratis selamanya • Setup dalam 30 detik • Tanpa kartu kredit',
    ctaFeatures: ['AI Summarizer & Kuis Adaptif', 'Duit Tracker + Si Bawel', 'Makan Apa & Split Bill', 'Virtual Pet & Gamifikasi'],

    // Pricing
    pricingBadge: 'Harga',
    pricingTitle1: 'Pilih Paket',
    pricingTitle2: 'yang Cocok Buatmu',
    pricingSub: 'Mulai gratis, upgrade kapan saja sesuai kebutuhanmu.',
    pricingFree: 'Newbie',
    pricingFreePrice: 'Rp 0',
    pricingFreePeriod: '7 hari trial',
    pricingFreeDesc: 'Semua fitur dasar untuk belajar efektif.',
    pricingFreeFeatures: ['Kelas & Forum Diskusi', 'Duit Tracker (bills & debts)', 'To-Do List + Kategori', 'Q&A Forum', '20 AI Request / hari', 'Virtual Pet & Streak', 'Gamifikasi & Quiz Keuangan'],
    pricingFreeCta: 'Mulai Gratis',
    pricingMid: 'Hustler',
    pricingMidPrice: 'Rp 24.900',
    pricingMidPeriod: '/bulan',
    pricingMidDesc: 'Fitur lengkap untuk kamu yang mulai serius.',
    pricingMidFeatures: ['250 AI Request / hari', 'Quiz & Kuis Adaptif', 'Prediksi Ujian', 'AI Insight & Daily Briefing', 'Si Bawel + Split Bill', 'Makan Apa + Meal Plan AI', 'Skripsweet AI Chat', 'Leaderboard & Profile Card'],
    pricingMidCta: 'Upgrade ke Hustler',
    pricingPro: 'Full Power',
    pricingProPrice: 'Rp 39.900',
    pricingProPeriod: '/bulan',
    pricingProDesc: 'Semua fitur tanpa batas untuk kamu yang all-out.',
    pricingProFeatures: ['999 AI Request / hari', 'Semua fitur Hustler +', 'Canvas & Kolektif', 'Prediksi Ujian + Kisi-kisi', 'Si Bawel + Memory', 'Receipt Scanner', 'Makan Apa: Fridge & Menu Scan', 'To-Do: Calendar, Timeline, AI Parse', 'Skripsweet Full Suite', 'Dashboard AI Insight'],
    pricingProCta: 'Upgrade ke Full Power',
    pricingProBadge: 'Populer',

    // Footer
    footerProduct: 'Produk',
    footerProductLinks: ['Fitur', 'Cara Kerja', 'Harga'],
    footerSupport: 'Dukungan',
    footerSupportLinks: ['FAQ', 'Hubungi Kami', 'Dokumentasi'],
    footerLegal: 'Legal',
    footerLegalLinks: ['Privasi', 'Ketentuan', 'Keamanan'],
    footerTagline: 'Platform produktivitas berbasis AI untuk anak muda Indonesia.',
    footerMadeWith: 'Dibuat dengan',
    footerForStudents: 'untuk anak muda Indonesia',
  },
  en: {
    badge: '#1 AI-Powered Academic Platform in Indonesia',
    heroTitle1: 'Revolutionize How',
    heroTitle2: 'Students Learn',
    heroTitle3: 'with AI',
    heroDesc: 'Summarize materials in seconds, adaptive quizzes, exam predictions, financial tracker + AI coach, food recommendations, split bills, virtual pet — all in one app designed for young people.',
    ctaPrimary: 'Start Free Now',
    ctaSecondary: 'Watch Demo',
    ctaTertiary: 'Explore Features',
    proofFree: 'Free forever',
    proofNoCC: 'No credit card',
    proofAI: 'Powered by Gemini AI',
    proofSetup: '30s setup',
    scroll: 'Explore',
    navLogin: 'Log In',
    navRegister: 'Sign Up Free',
    navFeatures: 'Features',
    navHowItWorks: 'How It Works',
    navTestimonials: 'Testimonials',

    statSessions: 'Class Sessions',
    statSessionsSub: 'per class',
    statFeatures: 'Powerful Features',
    statFeaturesSub: 'in one platform',
    statAccuracy: 'AI Accuracy',
    statAccuracySub: 'for summaries',
    statFaster: 'Times Faster',
    statFasterSub: 'than manual work',

    highlightBadge: 'Why Synapse?',
    highlightTitle1: 'One Platform,',
    highlightTitle2: 'Everything You Need',
    highlightSub: 'Stop switching between apps. Synapse unifies academics, finances, food, and productivity in one elegant dashboard.',
    highlights: [
      { title: 'AI That Truly Gets You', desc: 'Not just a chatbot. Our AI summarizes materials, predicts exams, recommends food, coaches your finances, and answers Q&A — all personalized.', icon: 'brain' },
      { title: 'All-in-One Life Platform', desc: 'College, finances, food, to-do, split bills — all in one app. No need to install 10 different apps to live productively.', icon: 'users' },
      { title: 'Gamification That Hooks You', desc: 'Virtual pet, streak calendar, XP & level-up, leaderboard, achievement badges, and finance quizzes. Learning & productivity feels like gaming.', icon: 'folder' },
    ],

    featBadge: 'Full Features',
    featTitle1: 'Everything You Need',
    featTitle2: 'to Live Productively',
    featSub: 'Not just for college — Synapse helps every aspect of young Indonesian life.',
    features: [
      { title: 'AI Summarizer', desc: 'Upload PDF or image course materials, AI creates smart summaries with key points in seconds. Save hours of study time.', tag: 'AI' },
      { title: 'Adaptive Quiz', desc: 'AI analyzes your weaknesses from previous quizzes and creates targeted questions. The more you practice, the smarter it gets.', tag: 'AI' },
      { title: 'Exam Prediction + Study Guide', desc: 'AI predicts questions likely to appear on exams based on all materials. Upload study guides for even more accurate results.', tag: 'AI' },
      { title: 'Daily Briefing & AI Insight', desc: 'Get a personal briefing every morning — today\'s deadlines, study tips, and AI insights about your learning patterns. Auto-motivation!', tag: 'AI' },
      { title: 'Duit Tracker', desc: 'Track income & expenses, manage bills, debts, monthly budgets, saving tree, wishlist, and even financial challenges.', tag: 'Finance' },
      { title: 'Si Bawel (AI Coach)', desc: 'AI financial coach that remembers your habits. It\'ll "nag" you when you overspend and give personalized tips. Has memory!', tag: 'Finance' },
      { title: 'Makan Apa (AI Food Rec)', desc: 'Can\'t decide what to eat? AI recommends food based on your budget, location, dietary preferences, and today\'s mood.', tag: 'Lifestyle' },
      { title: 'Split Bill & Receipt Scanner', desc: 'Scan receipts with camera, AI auto-splits costs. No more manual calculations when eating out with friends.', tag: 'Finance' },
      { title: 'Real-time Discussion Forum', desc: 'Discussion per class with separate threads, voting, rich text editor, collaborative canvas, and new message indicators.', tag: 'Social' },
      { title: 'Pro To-Do List', desc: 'Not your average to-do — calendar view, timeline, subtasks, recurring tasks, categories, and AI parsing. Next-level productivity.', tag: 'Productivity' },
      { title: 'Virtual Pet & Gamification', desc: 'Raise a pixel pet that grows with your productivity! Streak calendar, XP, level-up, leaderboard, and achievement badges.', tag: 'Lifestyle' },
      { title: 'Q&A Forum + AI Answer', desc: 'Ask anything in public Q&A, vote best answers, or ask AI to answer directly. Your reputation grows with each upvoted answer.', tag: 'Social' },
      { title: 'Groups & Collective Funds', desc: 'Create study groups, assign tasks per member, and manage class funds transparently. All members can view history.', tag: 'Team' },
      { title: 'Finance Quiz', desc: 'Test your financial literacy with interactive quizzes. Learn financial planning while playing — perfect for beginners.', tag: 'Finance' },
      { title: 'What-If Calculator', desc: 'Simulate financial scenarios — "if I save 500k/month, when can I buy a laptop?" AI calculates and visualizes results.', tag: 'Finance' },
      { title: 'Profile Card & Command Palette', desc: 'Shareable digital profile card, plus command palette (Ctrl+K) for super-fast feature access. Power user vibes.', tag: 'Productivity' },
    ],

    howBadge: 'How It Works',
    howTitle1: 'Four Steps to',
    howTitle2: 'Perfect Grades',
    howSub: 'From zero to exam-ready — everything can be done in minutes.',
    steps: [
      { num: '01', title: 'Sign Up in 30 Seconds', desc: 'Register free with email or Google. Instantly access all basic features — classes, duit tracker, to-do, virtual pet, and more.', detail: 'No credit card needed' },
      { num: '02', title: 'Setup Your Life', desc: 'Join or create classes, set financial budgets, organize your to-do list, and meet Si Bawel — the AI coach who\'ll be your buddy.', detail: 'Personalized setup' },
      { num: '03', title: 'AI Handles Everything', desc: 'Upload materials — AI summarizes. Can\'t decide food — AI recommends. Overspending — Si Bawel nags. Exam coming — AI predicts. All automatic.', detail: 'Powered by Gemini' },
      { num: '04', title: 'Keep Leveling Up', desc: 'Streaks rise, pet grows, XP accumulates, leaderboard climbs. The more productive you are, the more fun it gets. Life becomes a game!', detail: 'Full gamification' },
    ],

    // Video demo
    videoBadge: 'See It In Action',
    videoTitle1: 'Watch Synapse',
    videoTitle2: 'In Action',
    videoSub: 'See how Synapse users summarize materials, practice quizzes, and collaborate — all within minutes.',
    videoPlayBtn: 'Watch Demo',

    showcaseBadge: 'App Preview',
    showcaseTitle1: 'Designed for',
    showcaseTitle2: 'Modern Learners',
    showcaseSub: 'Clean interface, responsive, and dark mode support. All features accessible in a few clicks.',
    showcaseItems: [
      { title: 'All-in-One Dashboard', desc: 'Classes, deadlines, finances, and recent activity — all visible in one page.' },
      { title: 'Duit Tracker + Si Bawel', desc: 'Track finances, budget, and receive AI coach "nagging" that knows your habits.' },
      { title: 'AI Food & Split Bill', desc: 'Food recommendations within budget, scan receipts, and auto-split costs.' },
      { title: 'Virtual Pet & Gamification', desc: 'Pixel pet that grows with your productivity, leaderboard, and achievements.' },
    ],

    testiBadge: 'Testimonials',
    testiTitle1: 'Loved by Users',
    testiTitle2: 'Across Indonesia',
    testiSub: 'See what they have to say about learning with Synapse.',
    testimonials: [
      { name: 'Rina Salsabila', major: 'Management — University of Indonesia', text: 'Synapse makes summarizing super fast! I used to spend 2-3 hours making notes, now the AI does it in seconds. Plus the PDF export is great for printing before exams.', avatar: 'R', rating: 5 },
      { name: 'Andi Pratama', major: 'Computer Science — ITB', text: 'The adaptive quiz feature is incredible. The AI knows exactly which topics I struggle with and keeps quizzing me on them until I truly understand. My midterm scores improved dramatically!', avatar: 'A', rating: 5 },
      { name: 'Maya Lestari', major: 'Accounting — Binus University', text: 'The discussion forum is super complete — separate threads per topic, voting, even a canvas for meeting notes. No need to create WhatsApp groups for every course anymore.', avatar: 'M', rating: 5 },
      { name: 'Dimas Arya', major: 'Law — Gadjah Mada University', text: 'The exam prediction is surprisingly accurate. 7 out of 10 predicted questions actually appeared on my final exam. This is a game changer for exam prep!', avatar: 'D', rating: 5 },
      { name: 'Sari Dewi', major: 'Medicine — Airlangga University', text: 'Our course materials are enormous. Synapse makes reviewing structured and efficient. The group feature also helps a lot for PBL sessions.', avatar: 'S', rating: 5 },
      { name: 'Rizky Fauzan', major: 'Information Systems — UGM', text: 'The collective funds feature is super useful for managing class treasury. Transparent, everyone can see, no separate spreadsheets needed. Task management is also great.', avatar: 'F', rating: 5 },
    ],

    faqBadge: 'FAQ',
    faqTitle1: 'Frequently Asked',
    faqTitle2: 'Questions',
    faqs: [
      { q: 'Is Synapse really free?', a: 'Yes! The Newbie plan is free for 7 days — classes, forums, duit tracker, to-do list, virtual pet, and 20 AI requests/day. Upgrade to Hustler (Rp 24,900) or Full Power (Rp 39,900) for full features & higher limits.' },
      { q: 'What AI model does it use?', a: 'Synapse uses Google Gemini AI (gemini-2.0-flash) optimized for academic and financial content in Indonesian and English.' },
      { q: 'What financial features are included?', a: 'Super comprehensive — income/expense tracking, bills, debts, budgets, saving tree, wishlist, financial challenges, split bill, receipt scanner, and Si Bawel (AI coach with memory).' },
      { q: 'Can it be used for any major?', a: 'Synapse is designed for all majors. Academic features (AI summarizer, quizzes, predictions) work across all fields. Lifestyle features (finances, food, to-do) work for everyone.' },
      { q: 'Is my data safe?', a: 'Absolutely! All data is encrypted on Supabase. Files are only accessible to class members. Financial data is private and cannot be seen by others.' },
      { q: 'Can I access it from my phone?', a: 'Yes, Synapse is fully responsive and installable as a PWA (Progressive Web App) on your phone. Feels like a native app without downloading from the store.' },
    ],

    ctaTitle1: 'Ready to Revolutionize',
    ctaTitle2: 'Your Learning?',
    ctaDesc: 'Join thousands of young learners who already experience the ease of learning with AI. Free, no time limits, no credit card.',
    ctaBtn: 'Start Free Now',
    ctaNote: 'Free forever • 30s setup • No credit card',
    ctaFeatures: ['AI Summarizer & Adaptive Quiz', 'Duit Tracker + Si Bawel', 'Makan Apa & Split Bill', 'Virtual Pet & Gamification'],

    // Pricing
    pricingBadge: 'Pricing',
    pricingTitle1: 'Choose the Plan',
    pricingTitle2: 'That Fits You',
    pricingSub: 'Start free, upgrade anytime as you need.',
    pricingFree: 'Newbie',
    pricingFreePrice: 'Rp 0',
    pricingFreePeriod: '7-day trial',
    pricingFreeDesc: 'All essential features for effective learning.',
    pricingFreeFeatures: ['Class & Discussion Forum', 'Duit Tracker (bills & debts)', 'To-Do List + Categories', 'Q&A Forum', '20 AI Requests / day', 'Virtual Pet & Streak', 'Gamification & Finance Quiz'],
    pricingFreeCta: 'Start Free',
    pricingMid: 'Hustler',
    pricingMidPrice: 'Rp 24,900',
    pricingMidPeriod: '/month',
    pricingMidDesc: 'Full features for serious learners.',
    pricingMidFeatures: ['250 AI Requests / day', 'Quiz & Adaptive Quiz', 'Exam Prediction', 'AI Insight & Daily Briefing', 'Si Bawel + Split Bill', 'Food Recommend + Meal Plan AI', 'Skripsweet AI Chat', 'Leaderboard & Profile Card'],
    pricingMidCta: 'Upgrade to Hustler',
    pricingPro: 'Full Power',
    pricingProPrice: 'Rp 39,900',
    pricingProPeriod: '/month',
    pricingProDesc: 'All features unlocked for those who go all-out.',
    pricingProFeatures: ['999 AI Requests / day', 'All Hustler features +', 'Canvas & Kolektif', 'Exam Prediction + Study Guide', 'Si Bawel + Memory', 'Receipt Scanner', 'Food: Fridge & Menu Scan', 'To-Do: Calendar, Timeline, AI Parse', 'Skripsweet Full Suite', 'Dashboard AI Insight'],
    pricingProCta: 'Upgrade to Full Power',
    pricingProBadge: 'Popular',

    footerProduct: 'Product',
    footerProductLinks: ['Features', 'How It Works', 'Pricing'],
    footerSupport: 'Support',
    footerSupportLinks: ['FAQ', 'Contact Us', 'Documentation'],
    footerLegal: 'Legal',
    footerLegalLinks: ['Privacy', 'Terms', 'Security'],
    footerTagline: 'AI-powered productivity platform for young Indonesians.',
    footerMadeWith: 'Made with',
    footerForStudents: 'for young Indonesians',
  },
};

const FEAT_META: { icon: typeof Brain; color: string; gradient: string }[] = [
  { icon: Brain, color: '#00D4FF', gradient: 'linear-gradient(135deg, #00D4FF, #0096FF)' },
  { icon: Target, color: '#00F5A0', gradient: 'linear-gradient(135deg, #00F5A0, #00D68F)' },
  { icon: BarChart3, color: '#f093fb', gradient: 'linear-gradient(135deg, #f093fb, #f5576c)' },
  { icon: Sparkles, color: '#a18cd1', gradient: 'linear-gradient(135deg, #a18cd1, #fbc2eb)' },
  { icon: Wallet, color: '#f6d365', gradient: 'linear-gradient(135deg, #f6d365, #fda085)' },
  { icon: MessageSquare, color: '#fa709a', gradient: 'linear-gradient(135deg, #fa709a, #fee140)' },
  { icon: Zap, color: '#43e97b', gradient: 'linear-gradient(135deg, #43e97b, #38f9d7)' },
  { icon: FileText, color: '#4facfe', gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
  { icon: Users, color: '#667eea', gradient: 'linear-gradient(135deg, #667eea, #764ba2)' },
  { icon: ClipboardList, color: '#FF6B6B', gradient: 'linear-gradient(135deg, #FF6B6B, #ee5a24)' },
  { icon: Star, color: '#fdcb6e', gradient: 'linear-gradient(135deg, #fdcb6e, #e17055)' },
  { icon: GraduationCap, color: '#a29bfe', gradient: 'linear-gradient(135deg, #a29bfe, #6c5ce7)' },
  { icon: FolderOpen, color: '#00D4FF', gradient: 'linear-gradient(135deg, #00D4FF, #00F5A0)' },
  { icon: Shield, color: '#f093fb', gradient: 'linear-gradient(135deg, #f093fb, #a18cd1)' },
  { icon: PenTool, color: '#00F5A0', gradient: 'linear-gradient(135deg, #00F5A0, #43e97b)' },
  { icon: Bell, color: '#4facfe', gradient: 'linear-gradient(135deg, #4facfe, #667eea)' },
];

const TAG_COLORS: Record<string, { bg: string; color: string; bgLight: string; colorLight: string }> = {
  'AI':     { bg: 'rgba(0,212,255,0.12)', color: '#00D4FF', bgLight: 'rgba(0,180,220,0.1)', colorLight: '#0088aa' },
  'Kelas':  { bg: 'rgba(161,140,209,0.12)', color: '#a18cd1', bgLight: 'rgba(140,120,190,0.1)', colorLight: '#7a5fb5' },
  'Class':  { bg: 'rgba(161,140,209,0.12)', color: '#a18cd1', bgLight: 'rgba(140,120,190,0.1)', colorLight: '#7a5fb5' },
  'Sosial': { bg: 'rgba(79,172,254,0.12)', color: '#4facfe', bgLight: 'rgba(60,140,220,0.1)', colorLight: '#2878c8' },
  'Social': { bg: 'rgba(79,172,254,0.12)', color: '#4facfe', bgLight: 'rgba(60,140,220,0.1)', colorLight: '#2878c8' },
  'Tim':    { bg: 'rgba(250,112,154,0.12)', color: '#fa709a', bgLight: 'rgba(220,80,120,0.1)', colorLight: '#d04870' },
  'Team':   { bg: 'rgba(250,112,154,0.12)', color: '#fa709a', bgLight: 'rgba(220,80,120,0.1)', colorLight: '#d04870' },
  'Tools':  { bg: 'rgba(246,211,101,0.12)', color: '#f6d365', bgLight: 'rgba(200,170,60,0.1)', colorLight: '#b8960a' },
  'Admin':  { bg: 'rgba(162,155,254,0.12)', color: '#a29bfe', bgLight: 'rgba(130,120,220,0.1)', colorLight: '#6c5ce7' },
  'Keuangan': { bg: 'rgba(246,211,101,0.12)', color: '#f6d365', bgLight: 'rgba(200,170,60,0.1)', colorLight: '#b89000' },
  'Finance':  { bg: 'rgba(246,211,101,0.12)', color: '#f6d365', bgLight: 'rgba(200,170,60,0.1)', colorLight: '#b89000' },
  'Lifestyle': { bg: 'rgba(67,233,123,0.12)', color: '#43e97b', bgLight: 'rgba(50,180,100,0.1)', colorLight: '#1a9a50' },
  'Produktivitas': { bg: 'rgba(102,126,234,0.12)', color: '#667eea', bgLight: 'rgba(80,100,200,0.1)', colorLight: '#4a5fc0' },
  'Productivity': { bg: 'rgba(102,126,234,0.12)', color: '#667eea', bgLight: 'rgba(80,100,200,0.1)', colorLight: '#4a5fc0' },
};

/* ═══ Hooks ═══ */

function useCounter(end: number, duration = 2000) {
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true); }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { started, ref, end, duration };
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useThemeColors(isDark: boolean) {
  return useMemo(() => isDark ? {
    bg: 'rgb(6, 11, 24)',
    bgAlt: 'rgb(10, 16, 32)',
    text: '#e8ecf4',
    textSub: 'rgba(160,175,210,0.75)',
    textMuted: 'rgba(140,160,200,0.6)',
    textFaint: 'rgba(140,160,200,0.5)',
    textUltraFaint: 'rgba(100,130,180,0.35)',
    subtitleColor: 'rgba(200,210,230,0.9)',
    cardBg: 'rgba(255,255,255,0.025)',
    cardBgHover: 'rgba(255,255,255,0.04)',
    cardBorder: 'rgba(255,255,255,0.05)',
    cardBorderHover: 'rgba(0,212,255,0.15)',
    navBg: 'rgba(6,11,24,0.88)',
    navBorder: 'rgba(0,212,255,0.08)',
    pillBg: 'rgba(0,212,255,0.06)',
    pillBorder: 'rgba(0,212,255,0.15)',
    pillColor: 'rgba(0,212,255,0.85)',
    logoBg: 'rgba(10,18,38,0.8)',
    logoBorder: 'rgba(0,212,255,0.2)',
    logoShadow: '0 0 60px rgba(0,212,255,0.2), 0 8px 32px rgba(0,0,0,0.5)',
    ctaSecBg: 'rgba(0,212,255,0.06)',
    ctaSecBorder: 'rgba(0,212,255,0.15)',
    ctaSecColor: 'rgba(0,212,255,0.85)',
    sectionAltBg: 'rgba(10,16,32,0.5)',
    ctaSectionBg: 'linear-gradient(180deg, transparent 0%, rgba(0,212,255,0.03) 50%, rgba(0,212,255,0.06) 100%)',
    glowOrb1: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)',
    glowOrb2: 'radial-gradient(circle, rgba(0,245,160,0.05) 0%, transparent 70%)',
    ctaGlow: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)',
    footerBorder: '1px solid rgba(255,255,255,0.04)',
    footerBg: 'rgba(4,8,18,0.6)',
    testiTextColor: 'rgba(200,210,230,0.8)',
    stepNumGrad: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,245,160,0.08))',
    toggleBg: 'rgba(255,255,255,0.06)',
    toggleBorder: 'rgba(255,255,255,0.1)',
    toggleColor: 'rgba(200,210,230,0.7)',
    ctaBtnShadow: '0 4px 32px rgba(0,212,255,0.4), 0 0 80px rgba(0,212,255,0.15)',
    heroBtnShadow: '0 4px 24px rgba(0,212,255,0.35)',
    navRegShadow: '0 2px 12px rgba(0,212,255,0.3)',
    scrollIndicator: 'rgba(100,130,180,0.3)',
    faqBg: 'rgba(255,255,255,0.02)',
    faqBorder: 'rgba(255,255,255,0.05)',
    faqActiveBg: 'rgba(0,212,255,0.04)',
    highlightCardBg: 'rgba(255,255,255,0.03)',
    highlightCardBorder: 'rgba(255,255,255,0.06)',
    showcaseCardBg: 'rgba(255,255,255,0.02)',
    stepConnector: 'rgba(0,212,255,0.15)',
    statCardBg: 'rgba(255,255,255,0.025)',
    statCardBorder: 'rgba(255,255,255,0.05)',
  } : {
    bg: '#f8fafc',
    bgAlt: '#f0f4f8',
    text: '#111827',
    textSub: 'rgba(30,50,80,0.8)',
    textMuted: 'rgba(50,70,100,0.7)',
    textFaint: 'rgba(50,70,100,0.6)',
    textUltraFaint: 'rgba(70,90,120,0.5)',
    subtitleColor: '#1e293b',
    cardBg: 'rgba(255,255,255,0.95)',
    cardBgHover: '#ffffff',
    cardBorder: 'rgba(0,0,0,0.08)',
    cardBorderHover: 'rgba(0,150,200,0.25)',
    navBg: 'rgba(248,250,252,0.92)',
    navBorder: 'rgba(0,0,0,0.06)',
    pillBg: 'rgba(0,180,220,0.08)',
    pillBorder: 'rgba(0,180,220,0.2)',
    pillColor: '#0095b3',
    logoBg: '#ffffff',
    logoBorder: 'rgba(0,180,220,0.25)',
    logoShadow: '0 0 40px rgba(0,180,220,0.12), 0 8px 32px rgba(0,0,0,0.08)',
    ctaSecBg: 'rgba(0,180,220,0.06)',
    ctaSecBorder: 'rgba(0,180,220,0.2)',
    ctaSecColor: '#0095b3',
    sectionAltBg: '#f1f5f9',
    ctaSectionBg: 'linear-gradient(180deg, transparent 0%, rgba(0,180,220,0.04) 50%, rgba(0,180,220,0.07) 100%)',
    glowOrb1: 'radial-gradient(circle, rgba(0,180,220,0.06) 0%, transparent 70%)',
    glowOrb2: 'radial-gradient(circle, rgba(0,200,140,0.04) 0%, transparent 70%)',
    ctaGlow: 'radial-gradient(circle, rgba(0,180,220,0.08) 0%, transparent 70%)',
    footerBorder: '1px solid rgba(0,0,0,0.06)',
    footerBg: '#f1f5f9',
    testiTextColor: 'rgba(30,50,80,0.85)',
    stepNumGrad: 'linear-gradient(135deg, rgba(0,180,220,0.2), rgba(0,200,140,0.12))',
    toggleBg: 'rgba(0,0,0,0.04)',
    toggleBorder: 'rgba(0,0,0,0.1)',
    toggleColor: 'rgba(40,60,90,0.7)',
    ctaBtnShadow: '0 4px 24px rgba(0,180,220,0.3), 0 0 60px rgba(0,180,220,0.1)',
    heroBtnShadow: '0 4px 20px rgba(0,180,220,0.25)',
    navRegShadow: '0 2px 10px rgba(0,180,220,0.2)',
    scrollIndicator: 'rgba(60,80,110,0.3)',
    faqBg: 'rgba(255,255,255,0.8)',
    faqBorder: 'rgba(0,0,0,0.08)',
    faqActiveBg: 'rgba(0,150,200,0.06)',
    highlightCardBg: '#ffffff',
    highlightCardBorder: 'rgba(0,0,0,0.08)',
    showcaseCardBg: 'rgba(255,255,255,0.9)',
    stepConnector: 'rgba(0,150,200,0.25)',
    statCardBg: '#ffffff',
    statCardBorder: 'rgba(0,0,0,0.07)',
  }, [isDark]);
}

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */
export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [isDark, setIsDark] = useState(true);
  const [lang, setLang] = useState<Lang>('id');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeFeatureTag, setActiveFeatureTag] = useState<string | null>(null);
  const t = T[lang];
  const c = useThemeColors(isDark);

  const stats1 = useCounter(16, 1500);
  const stats2 = useCounter(30, 1800);
  const stats3 = useCounter(98, 2000);
  const stats4 = useCounter(10, 1200);

  const heroAnim = useInView(0.1);
  const highlightAnim = useInView();
  const featAnim = useInView();
  const howAnim = useInView();
  const videoAnim = useInView();
  const showcaseAnim = useInView();
  const testiAnim = useInView();

  useEffect(() => {
    const h = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const filteredFeatures = activeFeatureTag
    ? t.features.filter(f => f.tag === activeFeatureTag)
    : t.features;

  const allTags = useMemo(() => Array.from(new Set(t.features.map(f => f.tag))), [t.features]);

  const HIGHLIGHT_ICONS = [Brain, Users, FolderOpen];

  return (
    <div style={{ minHeight: '100vh', background: c.bg, color: c.text, overflow: 'hidden', transition: 'background 0.4s ease, color 0.4s ease' }}>

      {/* Landing page animations */}
      <style>{`
        @keyframes ctaGlow {
          0%, 100% { box-shadow: 0 4px 24px rgba(0,212,255,0.3), 0 0 60px rgba(0,212,255,0.1); }
          50% { box-shadow: 0 8px 48px rgba(0,212,255,0.6), 0 0 120px rgba(0,212,255,0.25), 0 0 200px rgba(0,245,160,0.1); }
        }
        @keyframes floatOrb {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes borderGlow {
          0%, 100% { border-color: rgba(0,212,255,0.15); }
          50% { border-color: rgba(0,245,160,0.3); }
        }
        @keyframes textGlow {
          0%, 100% { text-shadow: 0 0 20px rgba(0,212,255,0.3); }
          50% { text-shadow: 0 0 40px rgba(0,212,255,0.6), 0 0 80px rgba(0,245,160,0.2); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(40px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.3); }
          50% { opacity: 1; transform: scale(1.05); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        @keyframes floatUp {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes rotateGlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes morphBlob {
          0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          25% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
          50% { border-radius: 50% 60% 30% 60% / 30% 40% 70% 60%; }
          75% { border-radius: 60% 30% 60% 40% / 70% 60% 40% 30%; }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes typewriter {
          from { width: 0; }
          to { width: 100%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gentlePulse {
          0%, 100% { opacity: 0.5; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(3px); }
        }
        .landing-hero-gradient-text {
          background: linear-gradient(135deg, #00D4FF 0%, #00F5A0 30%, #A78BFA 60%, #00D4FF 100%);
          background-size: 300% 300%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradientShift 6s ease-in-out infinite;
        }
        .landing-card-shine {
          position: relative;
          overflow: hidden;
        }
        .landing-card-shine::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
          animation: shimmer 4s ease-in-out infinite;
          pointer-events: none;
        }
        .landing-stagger-1 { animation-delay: 0.05s !important; }
        .landing-stagger-2 { animation-delay: 0.1s !important; }
        .landing-stagger-3 { animation-delay: 0.15s !important; }
        .landing-stagger-4 { animation-delay: 0.2s !important; }
        .landing-stagger-5 { animation-delay: 0.25s !important; }
        .landing-stagger-6 { animation-delay: 0.3s !important; }
        .landing-blob {
          animation: morphBlob 8s ease-in-out infinite;
        }
        .landing-float {
          animation: floatUp 3s ease-in-out infinite;
        }
        .landing-float-delay {
          animation: floatUp 3.5s ease-in-out infinite 0.5s;
        }
        @media (prefers-reduced-motion: reduce) {
          .landing-cta-primary, .landing-cta-primary:hover {
            animation: none !important;
            transition: none !important;
          }
          .landing-hero-gradient-text { animation: none !important; }
          .landing-card-shine::after { animation: none !important; }
          .landing-blob { animation: none !important; border-radius: 50% !important; }
          .landing-float, .landing-float-delay { animation: none !important; }
        }
        .landing-cta-primary:hover {
          transform: translateY(-3px) scale(1.02) !important;
          filter: brightness(1.15);
        }
        .landing-cta-secondary:hover {
          background: ${isDark ? 'rgba(0,212,255,0.12)' : 'rgba(0,180,220,0.12)'} !important;
          transform: translateY(-2px) scale(1.01);
        }
        .landing-card:hover {
          transform: translateY(-6px) scale(1.01);
          border-color: ${isDark ? 'rgba(0,212,255,0.25)' : 'rgba(0,180,220,0.3)'} !important;
          box-shadow: ${isDark ? '0 20px 60px rgba(0,0,0,0.4), 0 0 30px rgba(0,212,255,0.1)' : '0 20px 60px rgba(0,0,0,0.1), 0 0 30px rgba(0,180,220,0.08)'};
        }
        .landing-nav-link:hover { color: ${isDark ? '#00D4FF' : '#0095b3'} !important; }
        .landing-pricing-card-pro {
          animation: borderGlow 3s ease-in-out infinite;
        }
        .landing-pricing-card-pro:hover {
          transform: translateY(-8px) scale(1.02) !important;
          box-shadow: 0 30px 80px rgba(0,212,255,0.2), 0 0 40px rgba(0,245,160,0.1) !important;
        }
        .landing-badge-pulse {
          animation: glowPulse 2s ease-in-out infinite;
        }
        @media (max-width: 768px) {
          .landing-nav-center { display: none !important; }
          .landing-hero-title { font-size: 2.2rem !important; }
          .landing-hero-btns { flex-direction: column !important; align-items: stretch !important; }
          .landing-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .landing-footer-grid { grid-template-columns: 1fr !important; text-align: center !important; }
          .landing-device-layout { flex-direction: column !important; align-items: center !important; }
          .landing-nav-auth-text { display: none !important; }
          .landing-pricing-grid { grid-template-columns: 1fr !important; }
          .landing-phone-mockup { width: 220px !important; height: 440px !important; }
          .landing-phone-mockup [data-notch] { width: 90px !important; height: 18px !important; }
          .landing-section { padding-left: 1rem !important; padding-right: 1rem !important; }
          .landing-footer-bottom { flex-direction: column !important; gap: 0.5rem !important; text-align: center !important; }
        }
        @media (max-width: 480px) {
          .landing-stats-grid { grid-template-columns: 1fr !important; }
          .landing-phone-mockup { width: 180px !important; height: 360px !important; }
        }
      `}</style>

      {/* ═══ NAVBAR ═══ */}
      <nav className="landing-navbar" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0.7rem 1.5rem',
        background: scrollY > 50 ? c.navBg : 'transparent',
        backdropFilter: scrollY > 50 ? 'blur(24px) saturate(180%)' : 'none',
        borderBottom: scrollY > 50 ? `1px solid ${c.navBorder}` : '1px solid transparent',
        transition: 'all 0.3s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Image src={brand.logoPath} alt={brand.name} width={30} height={30} style={{ objectFit: 'contain' }} />
          <span style={{ fontSize: '1.1rem', fontWeight: 800, background: 'linear-gradient(135deg, #00D4FF, #00F5A0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{brand.name}</span>
        </div>

        {/* Nav center links */}
        <div className="landing-nav-center" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          {[
            { label: t.navFeatures, href: '#features' },
            { label: t.navHowItWorks, href: '#how-it-works' },
            { label: t.navTestimonials, href: '#testimonials' },
          ].map(link => (
            <a key={link.href} href={link.href} className="landing-nav-link" style={{ fontSize: '0.8rem', fontWeight: 500, color: c.textMuted, textDecoration: 'none', transition: 'color 0.2s' }}>{link.label}</a>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          <button onClick={() => setLang(l => l === 'id' ? 'en' : 'id')} title="Switch language" style={{
            padding: '0.35rem 0.6rem', borderRadius: 8, border: `1px solid ${c.toggleBorder}`,
            background: c.toggleBg, color: c.toggleColor, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', fontWeight: 600,
            fontFamily: 'inherit', transition: 'all 0.2s',
          }}>
            <Globe size={12} /> {lang.toUpperCase()}
          </button>
          <button onClick={() => setIsDark(d => !d)} title="Toggle theme" style={{
            padding: '0.35rem', borderRadius: 8, border: `1px solid ${c.toggleBorder}`,
            background: c.toggleBg, color: c.toggleColor, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
          }}>
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <Link href="/auth" className="landing-nav-auth-text" style={{ padding: '0.45rem 1.1rem', borderRadius: 10, fontSize: '0.8rem', fontWeight: 600, color: c.ctaSecColor, background: 'none', border: 'none', textDecoration: 'none', transition: 'opacity 0.2s' }}>{t.navLogin}</Link>
          <Link href="/auth" style={{ padding: '0.45rem 0.85rem', borderRadius: 10, fontSize: '0.8rem', fontWeight: 700, color: '#060B18', background: 'linear-gradient(135deg, #00D4FF, #00F5A0)', textDecoration: 'none', boxShadow: c.navRegShadow, transition: 'all 0.2s', whiteSpace: 'nowrap' }}>{t.navRegister}</Link>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section ref={heroAnim.ref} className="landing-section" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '7rem 1.5rem 4rem', position: 'relative' }}>
        {/* Animated grid pattern */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(circle, ${isDark ? 'rgba(0,212,255,0.03)' : 'rgba(0,150,200,0.03)'} 1px, transparent 1px)`, backgroundSize: '40px 40px', pointerEvents: 'none', opacity: 0.8 }} />
        
        {/* Glow orbs */}
        <div className="landing-blob" style={{ position: 'absolute', top: '-20%', left: '25%', width: 800, height: 800, background: c.glowOrb1, pointerEvents: 'none', filter: 'blur(60px)', animation: 'floatOrb 20s ease-in-out infinite, morphBlob 8s ease-in-out infinite' }} />
        <div className="landing-blob" style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: 600, height: 600, background: c.glowOrb2, pointerEvents: 'none', filter: 'blur(50px)', animation: 'floatOrb 15s ease-in-out infinite reverse, morphBlob 10s ease-in-out infinite 2s' }} />
        <div style={{ position: 'absolute', top: '15%', left: '-5%', width: 350, height: 350, borderRadius: '50%', background: isDark ? 'radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(140,120,190,0.05) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(20px)', animation: 'floatOrb 12s ease-in-out infinite 3s' }} />
        
        {/* Floating decorative elements */}
        <div className="landing-float" style={{ position: 'absolute', top: '20%', right: '15%', width: 12, height: 12, borderRadius: '50%', background: 'linear-gradient(135deg, #00D4FF, #00F5A0)', opacity: 0.4, pointerEvents: 'none' }} />
        <div className="landing-float-delay" style={{ position: 'absolute', top: '35%', left: '12%', width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg, #A78BFA, #00D4FF)', opacity: 0.3, pointerEvents: 'none' }} />
        <div className="landing-float" style={{ position: 'absolute', bottom: '25%', right: '20%', width: 6, height: 6, borderRadius: 3, background: '#00F5A0', opacity: 0.4, pointerEvents: 'none' }} />
        <div className="landing-float-delay" style={{ position: 'absolute', bottom: '30%', left: '18%', width: 10, height: 10, borderRadius: '50%', background: '#f093fb', opacity: 0.25, pointerEvents: 'none' }} />

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.4rem 1.1rem', borderRadius: 999, marginBottom: '2rem',
          background: c.pillBg, border: `1px solid ${c.pillBorder}`,
          fontSize: '0.78rem', color: c.pillColor, fontWeight: 600,
          opacity: heroAnim.inView ? 1 : 0, transform: heroAnim.inView ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <Sparkles size={13} /> {t.badge}
        </div>

        {/* Logo */}
        <div style={{
          width: 88, height: 88, borderRadius: 22, background: c.logoBg,
          border: `1px solid ${c.logoBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '2rem', boxShadow: c.logoShadow,
          opacity: heroAnim.inView ? 1 : 0, transform: heroAnim.inView ? 'scale(1)' : 'scale(0.8)',
          transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s',
        }}>
          <Image src={brand.logoPath} alt={brand.name} width={68} height={68} style={{ objectFit: 'contain' }} priority />
        </div>

        {/* Title */}
        <h1 className="landing-hero-title" style={{
          fontSize: 'clamp(2.5rem, 6.5vw, 4.8rem)', fontWeight: 800, letterSpacing: '-0.04em',
          lineHeight: 1.08, maxWidth: 860, marginBottom: '1.5rem',
          opacity: heroAnim.inView ? 1 : 0, transform: heroAnim.inView ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
        }}>
          <span style={{ color: c.subtitleColor }}>{t.heroTitle1}</span><br />
          <span className="landing-hero-gradient-text">{t.heroTitle2}</span><br />
          <span style={{ color: c.subtitleColor }}>{t.heroTitle3}</span>
        </h1>

        {/* Description */}
        <p style={{
          fontSize: 'clamp(0.95rem, 1.8vw, 1.2rem)', color: c.textSub, maxWidth: 620,
          lineHeight: 1.7, marginBottom: '2.5rem',
          opacity: heroAnim.inView ? 1 : 0, transform: heroAnim.inView ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.25s',
        }}>
          {t.heroDesc}
        </p>

        {/* CTA Buttons */}
        <div style={{
          display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2rem',
          opacity: heroAnim.inView ? 1 : 0, transform: heroAnim.inView ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.35s',
        }}>
          <Link href="/auth" style={{
            padding: '0.9rem 2.2rem', borderRadius: 14, fontSize: '1rem', fontWeight: 700,
            color: '#060B18', background: 'linear-gradient(135deg, #00D4FF, #00F5A0)',
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem',
            boxShadow: c.heroBtnShadow, transition: 'all 0.25s ease',
            animation: 'ctaGlow 3s ease-in-out infinite',
          }}>
            {t.ctaPrimary} <ArrowRight size={16} />
          </Link>
          <a href="#features" className="landing-cta-secondary" style={{
            padding: '0.9rem 2.2rem', borderRadius: 14, fontSize: '1rem', fontWeight: 600,
            color: c.ctaSecColor, background: c.ctaSecBg, border: `1px solid ${c.ctaSecBorder}`,
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.25s ease',
          }}>
            {t.ctaTertiary} <ChevronRight size={16} />
          </a>
        </div>

        {/* Social proof */}
        <div style={{
          display: 'flex', gap: '1.25rem', flexWrap: 'wrap', justifyContent: 'center',
          fontSize: '0.78rem', color: c.textFaint,
          opacity: heroAnim.inView ? 1 : 0, transition: 'all 0.7s ease 0.45s',
        }}>
          {[t.proofFree, t.proofNoCC, t.proofAI, t.proofSetup].map((p, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <CheckCircle2 size={13} style={{ color: '#00C98D' }} /> {p}
            </span>
          ))}
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute', bottom: '2rem',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem',
          color: c.scrollIndicator, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase',
          animation: 'gentlePulse 2s ease-in-out infinite',
        }}>
          <span>{t.scroll}</span>
          <ChevronDown size={14} />
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section style={{ padding: '3.5rem 2rem', position: 'relative' }}>
        {/* Separator gradient line */}
        <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, background: `linear-gradient(90deg, transparent, ${isDark ? 'rgba(0,212,255,0.2)' : 'rgba(0,180,220,0.15)'}, transparent)` }} />
        <div className="landing-stats-grid" style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {[
            { counter: stats1, suffix: '', label: t.statSessions, sub: t.statSessionsSub, gradient: 'linear-gradient(135deg, #00D4FF, #0096FF)' },
            { counter: stats2, suffix: '+', label: t.statFeatures, sub: t.statFeaturesSub, gradient: 'linear-gradient(135deg, #00F5A0, #00D68F)' },
            { counter: stats3, suffix: '%', label: t.statAccuracy, sub: t.statAccuracySub, gradient: 'linear-gradient(135deg, #f093fb, #f5576c)' },
            { counter: stats4, suffix: 'x', label: t.statFaster, sub: t.statFasterSub, gradient: 'linear-gradient(135deg, #f6d365, #fda085)' },
          ].map((stat, i) => (
            <div key={i} ref={stat.counter.ref} className="landing-card landing-card-shine" style={{
              padding: '1.5rem 1rem', borderRadius: 16, textAlign: 'center',
              background: c.statCardBg, border: `1px solid ${c.statCardBorder}`,
              backdropFilter: 'blur(8px)', transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}>
              <div style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 800, background: stat.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1 }}>
                <AnimatedNumber
                  value={stat.counter.started ? stat.counter.end : 0}
                  suffix={stat.suffix}
                  duration={stat.counter.duration}
                  countUp
                  style={{ background: stat.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                />
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: c.textSub, marginTop: '0.3rem' }}>{stat.label}</div>
              <div style={{ fontSize: '0.7rem', color: c.textMuted, marginTop: '0.1rem' }}>{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ WHY SYNAPSE ═══ */}
      <section ref={highlightAnim.ref} className="landing-section" style={{ padding: '5rem 1.5rem', background: c.sectionAltBg }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{
            textAlign: 'center', marginBottom: '3.5rem',
            opacity: highlightAnim.inView ? 1 : 0, transform: highlightAnim.inView ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.3rem 0.85rem', borderRadius: 999, fontSize: '0.75rem',
              background: isDark ? 'rgba(0,245,160,0.06)' : 'rgba(0,200,140,0.08)',
              border: isDark ? '1px solid rgba(0,245,160,0.12)' : '1px solid rgba(0,200,140,0.18)',
              color: isDark ? '#00F5A0' : '#009966', fontWeight: 600,
            }}>
              <Zap size={12} /> {t.highlightBadge}
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', marginTop: '0.85rem', marginBottom: '0.75rem' }}>
              {t.highlightTitle1}<br />
              <span className="landing-hero-gradient-text">{t.highlightTitle2}</span>
            </h2>
            <p style={{ fontSize: '1rem', color: c.textMuted, maxWidth: 600, margin: '0 auto', lineHeight: 1.65 }}>{t.highlightSub}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {t.highlights.map((h, i) => {
              const Icon = HIGHLIGHT_ICONS[i];
              const colors = ['#00D4FF', '#00F5A0', '#a18cd1'];
              return (
                <div key={i} className="landing-card landing-card-shine" style={{
                  padding: '2rem 1.75rem', borderRadius: 20,
                  background: c.highlightCardBg, border: `1px solid ${c.highlightCardBorder}`,
                  transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)', cursor: 'default',
                  opacity: highlightAnim.inView ? 1 : 0,
                  transform: highlightAnim.inView ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.95)',
                  transitionDelay: `${0.1 + i * 0.15}s`,
                }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: isDark ? `${colors[i]}10` : `${colors[i]}08`,
                    border: `1px solid ${isDark ? `${colors[i]}20` : `${colors[i]}15`}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '1.25rem',
                  }}>
                    <Icon size={22} style={{ color: colors[i] }} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.6rem' }}>{h.title}</h3>
                  <p style={{ fontSize: '0.88rem', color: c.textMuted, lineHeight: 1.65, margin: 0 }}>{h.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" ref={featAnim.ref} className="landing-section" style={{ padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{
            textAlign: 'center', marginBottom: '2.5rem',
            opacity: featAnim.inView ? 1 : 0, transform: featAnim.inView ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.3rem 0.85rem', borderRadius: 999, fontSize: '0.75rem',
              background: isDark ? 'rgba(0,212,255,0.06)' : 'rgba(0,180,220,0.08)',
              border: isDark ? '1px solid rgba(0,212,255,0.12)' : '1px solid rgba(0,180,220,0.18)',
              color: isDark ? '#00D4FF' : '#0088aa', fontWeight: 600,
            }}>
              <Layers size={12} /> {t.featBadge}
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', marginTop: '0.85rem', marginBottom: '0.75rem' }}>
              {t.featTitle1}<br />
              <span className="landing-hero-gradient-text">{t.featTitle2}</span>
            </h2>
            <p style={{ fontSize: '1rem', color: c.textMuted, maxWidth: 550, margin: '0 auto', lineHeight: 1.6 }}>{t.featSub}</p>
          </div>

          {/* Tag filter */}
          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <button onClick={() => setActiveFeatureTag(null)} style={{
              padding: '0.35rem 0.9rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
              border: `1px solid ${!activeFeatureTag ? (isDark ? 'rgba(0,212,255,0.3)' : 'rgba(0,180,220,0.3)') : c.cardBorder}`,
              background: !activeFeatureTag ? (isDark ? 'rgba(0,212,255,0.1)' : 'rgba(0,180,220,0.1)') : 'transparent',
              color: !activeFeatureTag ? (isDark ? '#00D4FF' : '#0088aa') : c.textMuted,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
            }}>
              {lang === 'id' ? 'Semua' : 'All'}
            </button>
            {allTags.map(tag => {
              const tc = TAG_COLORS[tag] || TAG_COLORS['Tools'];
              const isActive = activeFeatureTag === tag;
              return (
                <button key={tag} onClick={() => setActiveFeatureTag(isActive ? null : tag)} style={{
                  padding: '0.35rem 0.9rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
                  border: `1px solid ${isActive ? (isDark ? tc.color + '40' : tc.colorLight + '40') : c.cardBorder}`,
                  background: isActive ? (isDark ? tc.bg : tc.bgLight) : 'transparent',
                  color: isActive ? (isDark ? tc.color : tc.colorLight) : c.textMuted,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                }}>
                  {tag}
                </button>
              );
            })}
          </div>

          {/* Feature cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {filteredFeatures.map((f, i) => {
              const origIdx = t.features.indexOf(f);
              const m = FEAT_META[origIdx] || FEAT_META[0];
              const Icon = m.icon;
              const tc = TAG_COLORS[f.tag] || TAG_COLORS['Tools'];
              return (
                <div key={origIdx} className="landing-card landing-card-shine" style={{
                  padding: '1.5rem', borderRadius: 18,
                  background: c.cardBg, border: `1px solid ${c.cardBorder}`,
                  transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)', cursor: 'default',
                  opacity: featAnim.inView ? 1 : 0,
                  transform: featAnim.inView ? 'translateY(0) scale(1)' : 'translateY(25px) scale(0.97)',
                  transitionDelay: `${Math.min(i * 0.06, 0.5)}s`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 11,
                      background: isDark ? `${m.color}12` : `${m.color}08`,
                      border: `1px solid ${isDark ? `${m.color}22` : `${m.color}18`}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon size={18} style={{ color: m.color }} />
                    </div>
                    <span style={{
                      padding: '0.15rem 0.5rem', borderRadius: 999, fontSize: '0.6rem', fontWeight: 700,
                      background: isDark ? tc.bg : tc.bgLight,
                      color: isDark ? tc.color : tc.colorLight,
                      letterSpacing: '0.03em', textTransform: 'uppercase',
                    }}>
                      {f.tag}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.45rem' }}>{f.title}</h3>
                  <p style={{ fontSize: '0.82rem', color: c.textMuted, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how-it-works" ref={howAnim.ref} className="landing-section" style={{ padding: '5rem 1.5rem', background: c.sectionAltBg }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{
            textAlign: 'center', marginBottom: '3.5rem',
            opacity: howAnim.inView ? 1 : 0, transform: howAnim.inView ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.3rem 0.85rem', borderRadius: 999, fontSize: '0.75rem',
              background: isDark ? 'rgba(161,140,209,0.08)' : 'rgba(140,120,190,0.08)',
              border: isDark ? '1px solid rgba(161,140,209,0.15)' : '1px solid rgba(140,120,190,0.18)',
              color: isDark ? '#a18cd1' : '#7a5fb5', fontWeight: 600,
            }}>
              <GraduationCap size={12} /> {t.howBadge}
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', marginTop: '0.85rem', marginBottom: '0.75rem' }}>
              {t.howTitle1}<br />
              <span style={{ background: 'linear-gradient(135deg, #a18cd1, #fbc2eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t.howTitle2}</span>
            </h2>
            <p style={{ fontSize: '1rem', color: c.textMuted, maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>{t.howSub}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', position: 'relative' }}>
            {/* Connector line */}
            <div style={{ position: 'absolute', top: '3rem', left: '12.5%', right: '12.5%', height: 2, background: `linear-gradient(90deg, transparent, ${c.stepConnector}, ${c.stepConnector}, transparent)`, zIndex: 0 }} />

            {t.steps.map((s, i) => {
              const stepColors = ['#00D4FF', '#00F5A0', '#a18cd1', '#f093fb'];
              return (
                <div key={i} className="landing-card-shine" style={{
                  padding: '1.75rem 1.25rem', borderRadius: 18, textAlign: 'center',
                  background: c.cardBg, border: `1px solid ${c.cardBorder}`,
                  position: 'relative', zIndex: 1,
                  opacity: howAnim.inView ? 1 : 0,
                  transform: howAnim.inView ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.93)',
                  transition: `all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.1 + i * 0.15}s`,
                }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%', margin: '0 auto 1rem',
                    background: isDark ? `${stepColors[i]}12` : `${stepColors[i]}08`,
                    border: `2px solid ${isDark ? `${stepColors[i]}25` : `${stepColors[i]}20`}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem', fontWeight: 800, color: stepColors[i],
                  }}>
                    {s.num}
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{s.title}</h3>
                  <p style={{ fontSize: '0.8rem', color: c.textFaint, lineHeight: 1.55, margin: 0, marginBottom: '0.75rem' }}>{s.desc}</p>
                  <span style={{
                    display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 999,
                    fontSize: '0.6rem', fontWeight: 600,
                    background: isDark ? `${stepColors[i]}10` : `${stepColors[i]}08`,
                    color: stepColors[i],
                  }}>
                    {s.detail}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ VIDEO DEMO (Req 14.4) ═══ */}
      <section ref={videoAnim.ref} style={{ padding: '5rem 1.5rem', position: 'relative' }}>
        {/* Gradient separator */}
        <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: `linear-gradient(90deg, transparent, ${isDark ? 'rgba(240,147,251,0.2)' : 'rgba(200,80,180,0.12)'}, transparent)` }} />
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{
            textAlign: 'center', marginBottom: '2.5rem',
            opacity: videoAnim.inView ? 1 : 0, transform: videoAnim.inView ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.3rem 0.85rem', borderRadius: 999, fontSize: '0.75rem',
              background: isDark ? 'rgba(240,147,251,0.08)' : 'rgba(200,80,180,0.08)',
              border: isDark ? '1px solid rgba(240,147,251,0.15)' : '1px solid rgba(200,80,180,0.18)',
              color: isDark ? '#f093fb' : '#b050a0', fontWeight: 600,
            }}>
              <Play size={12} /> {t.videoBadge}
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', marginTop: '0.85rem', marginBottom: '0.75rem' }}>
              {t.videoTitle1}<br />
              <span style={{ background: 'linear-gradient(135deg, #f093fb, #f5576c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t.videoTitle2}</span>
            </h2>
            <p style={{ fontSize: '1rem', color: c.textMuted, maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>{t.videoSub}</p>
          </div>

          {/* Video embed frame */}
          <div style={{
            position: 'relative', borderRadius: 20, overflow: 'hidden',
            border: `1px solid ${c.cardBorder}`,
            boxShadow: isDark ? '0 20px 80px rgba(0,0,0,0.5)' : '0 20px 60px rgba(0,0,0,0.08)',
            opacity: videoAnim.inView ? 1 : 0,
            transform: videoAnim.inView ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.97)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
            aspectRatio: '16/9',
            background: isDark
              ? 'linear-gradient(135deg, rgba(10,16,32,0.95), rgba(16,22,40,0.95))'
              : 'linear-gradient(135deg, rgba(248,250,252,0.95), rgba(240,244,248,0.95))',
          }}>
            {/* Video placeholder with play button overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '1rem',
            }}>
              {/* Animated background circles */}
              <div style={{
                position: 'absolute', width: 300, height: 300, borderRadius: '50%',
                background: isDark ? 'rgba(0,212,255,0.06)' : 'rgba(0,180,220,0.06)',
                filter: 'blur(40px)', animation: 'floatOrb 10s ease-in-out infinite',
              }} />
              {/* Play button with glow */}
              <button
                aria-label={t.videoPlayBtn}
                style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00D4FF, #00F5A0)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isDark
                    ? '0 0 40px rgba(0,212,255,0.4), 0 0 80px rgba(0,212,255,0.15)'
                    : '0 0 30px rgba(0,180,220,0.3), 0 0 60px rgba(0,180,220,0.1)',
                  transition: 'all 0.3s ease',
                  animation: 'ctaGlow 3s ease-in-out infinite',
                  position: 'relative', zIndex: 1,
                }}
              >
                <Play size={32} fill="#060B18" style={{ color: '#060B18', marginLeft: 4 }} />
              </button>
              <span style={{
                fontSize: '0.85rem', fontWeight: 600, color: c.textSub,
                position: 'relative', zIndex: 1,
              }}>
                {t.videoPlayBtn}
              </span>
            </div>

            {/* Decorative screenshot grid behind play button */}
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.3,
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem',
              padding: '1.5rem',
            }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{
                  borderRadius: 12,
                  background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ DEVICE MOCKUP WITH APP SCREENSHOTS (Req 14.2) ═══ */}
      <section ref={showcaseAnim.ref} style={{ padding: '5rem 1.5rem', position: 'relative' }}>
        {/* Gradient separator */}
        <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: `linear-gradient(90deg, transparent, ${isDark ? 'rgba(79,172,254,0.2)' : 'rgba(60,140,220,0.12)'}, transparent)` }} />
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{
            textAlign: 'center', marginBottom: '3rem',
            opacity: showcaseAnim.inView ? 1 : 0, transform: showcaseAnim.inView ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.3rem 0.85rem', borderRadius: 999, fontSize: '0.75rem',
              background: isDark ? 'rgba(79,172,254,0.08)' : 'rgba(60,140,220,0.08)',
              border: isDark ? '1px solid rgba(79,172,254,0.15)' : '1px solid rgba(60,140,220,0.18)',
              color: isDark ? '#4facfe' : '#2878c8', fontWeight: 600,
            }}>
              <Smartphone size={12} /> {t.showcaseBadge}
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', marginTop: '0.85rem', marginBottom: '0.75rem' }}>
              {t.showcaseTitle1}<br />
              <span style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t.showcaseTitle2}</span>
            </h2>
            <p style={{ fontSize: '1rem', color: c.textMuted, maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>{t.showcaseSub}</p>
          </div>

          {/* Device Mockup Frame */}
          <div className="landing-device-layout" style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem', flexWrap: 'wrap',
            opacity: showcaseAnim.inView ? 1 : 0,
            transform: showcaseAnim.inView ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.95)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
          }}>
            {/* Phone mockup */}
            <div className="landing-phone-mockup landing-float" style={{
              position: 'relative',
              width: 280, height: 560,
              borderRadius: 36,
              background: isDark ? '#1a1a2e' : '#f8f8f8',
              border: isDark ? '8px solid #2d2d44' : '8px solid #d4d4d4',
              boxShadow: isDark
                ? '0 30px 80px rgba(0,0,0,0.6), inset 0 0 0 2px rgba(255,255,255,0.05), 0 0 60px rgba(0,212,255,0.08)'
                : '0 30px 60px rgba(0,0,0,0.12), inset 0 0 0 2px rgba(255,255,255,0.8), 0 0 40px rgba(0,180,220,0.06)',
              overflow: 'hidden',
            }}>
              {/* Phone notch */}
              <div data-notch style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 120, height: 24, borderRadius: '0 0 14px 14px',
                background: isDark ? '#2d2d44' : '#d4d4d4', zIndex: 2,
              }} />
              {/* Screen content - app screenshot placeholder */}
              <div style={{
                width: '100%', height: '100%', borderRadius: 28,
                background: isDark
                  ? 'linear-gradient(180deg, #0f1629 0%, #0a1020 100%)'
                  : 'linear-gradient(180deg, #f8fafc 0%, #eef2f6 100%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '2.5rem 1rem 1rem', overflow: 'hidden',
              }}>
                {/* Mini dashboard UI inside phone */}
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Image src={brand.logoPath} alt={brand.name} width={20} height={20} style={{ objectFit: 'contain' }} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: c.text }}>{brand.name}</span>
                </div>
                {/* Simulated class cards */}
                {[
                  { title: 'Algoritma & Pemrograman', color: '#00D4FF' },
                  { title: 'Kalkulus II', color: '#00F5A0' },
                  { title: 'Basis Data', color: '#a18cd1' },
                ].map((cls, i) => (
                  <div key={i} style={{
                    width: '100%', padding: '0.7rem', borderRadius: 10, marginBottom: '0.5rem',
                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: cls.color }} />
                      <span style={{ fontSize: '0.55rem', fontWeight: 600, color: c.text }}>{cls.title}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.35rem' }}>
                      {['Sesi 12', '3 Tugas'].map((t2, j) => (
                        <span key={j} style={{
                          fontSize: '0.45rem', padding: '0.1rem 0.3rem', borderRadius: 4,
                          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          color: c.textMuted,
                        }}>
                          {t2}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {/* Mini AI summary card */}
                <div style={{
                  width: '100%', padding: '0.6rem', borderRadius: 10, marginTop: '0.3rem',
                  background: isDark ? 'rgba(0,212,255,0.06)' : 'rgba(0,180,220,0.06)',
                  border: `1px solid ${isDark ? 'rgba(0,212,255,0.15)' : 'rgba(0,180,220,0.15)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem' }}>
                    <Brain size={10} style={{ color: '#00D4FF' }} />
                    <span style={{ fontSize: '0.5rem', fontWeight: 600, color: isDark ? '#00D4FF' : '#0088aa' }}>AI Rangkuman</span>
                  </div>
                  <div style={{ width: '90%', height: 4, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', marginBottom: '0.2rem' }} />
                  <div style={{ width: '70%', height: 4, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }} />
                </div>
              </div>
            </div>

            {/* Side feature cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 340 }}>
              {t.showcaseItems.map((item, i) => {
                const showcaseColors = ['#00D4FF', '#a18cd1', '#4facfe', '#00F5A0'];
                const showcaseIcons = [Layers, Wallet, Zap, Star];
                const SIcon = showcaseIcons[i];
                return (
                  <div key={i} style={{
                    padding: '1.15rem', borderRadius: 16,
                    background: c.showcaseCardBg, border: `1px solid ${c.cardBorder}`,
                    display: 'flex', gap: '0.85rem', alignItems: 'flex-start',
                    opacity: showcaseAnim.inView ? 1 : 0,
                    transform: showcaseAnim.inView ? 'translateX(0)' : 'translateX(30px)',
                    transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.3 + i * 0.1}s`,
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                      background: isDark ? `${showcaseColors[i]}10` : `${showcaseColors[i]}08`,
                      border: `1px solid ${isDark ? `${showcaseColors[i]}20` : `${showcaseColors[i]}15`}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <SIcon size={18} style={{ color: showcaseColors[i] }} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.2rem' }}>{item.title}</h4>
                      <p style={{ fontSize: '0.75rem', color: c.textMuted, lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section id="testimonials" ref={testiAnim.ref} className="landing-section" style={{ padding: '5rem 1.5rem', background: c.sectionAltBg }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{
            textAlign: 'center', marginBottom: '3rem',
            opacity: testiAnim.inView ? 1 : 0, transform: testiAnim.inView ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.3rem 0.85rem', borderRadius: 999, fontSize: '0.75rem',
              background: isDark ? 'rgba(250,112,154,0.08)' : 'rgba(220,80,120,0.08)',
              border: isDark ? '1px solid rgba(250,112,154,0.15)' : '1px solid rgba(220,80,120,0.18)',
              color: isDark ? '#fa709a' : '#d04870', fontWeight: 600,
            }}>
              <Star size={12} /> {t.testiBadge}
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', marginTop: '0.85rem', marginBottom: '0.6rem' }}>
              {t.testiTitle1}<br />
              <span style={{ background: 'linear-gradient(135deg, #fa709a, #fee140)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t.testiTitle2}</span>
            </h2>
            <p style={{ fontSize: '1rem', color: c.textMuted, maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>{t.testiSub}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {t.testimonials.map((testi, i) => {
              const avatarColors = [
                ['#667eea', '#764ba2'], ['#4facfe', '#00f2fe'], ['#fa709a', '#fee140'],
                ['#00D4FF', '#00F5A0'], ['#a18cd1', '#fbc2eb'], ['#43e97b', '#38f9d7'],
              ];
              const [c1, c2] = avatarColors[i % avatarColors.length];
              return (
                <div key={i} className="landing-card landing-card-shine" style={{
                  padding: '1.5rem', borderRadius: 18,
                  background: c.cardBg, border: `1px solid ${c.cardBorder}`,
                  opacity: testiAnim.inView ? 1 : 0,
                  transform: testiAnim.inView ? 'translateY(0) scale(1)' : 'translateY(25px) scale(0.97)',
                  transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.1 + i * 0.08}s`,
                }}>
                  <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '0.75rem' }}>
                    {[1,2,3,4,5].map(s => <Star key={s} size={12} fill="#f6d365" style={{ color: '#f6d365' }} />)}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: c.testiTextColor, lineHeight: 1.65, marginBottom: '1.25rem', fontStyle: 'italic' }}>&ldquo;{testi.text}&rdquo;</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderTop: `1px solid ${c.cardBorder}`, paddingTop: '1rem' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg, ${c1}, ${c2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{testi.avatar}</div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{testi.name}</div>
                      <div style={{ fontSize: '0.68rem', color: c.textFaint }}>{testi.major}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="landing-section" style={{ padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.3rem 0.85rem', borderRadius: 999, fontSize: '0.75rem',
              background: isDark ? 'rgba(0,212,255,0.06)' : 'rgba(0,180,220,0.08)',
              border: isDark ? '1px solid rgba(0,212,255,0.12)' : '1px solid rgba(0,180,220,0.18)',
              color: isDark ? '#00D4FF' : '#0095b3', fontWeight: 600,
            }}>
              <Layers size={12} /> {t.pricingBadge}
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', marginTop: '0.85rem', marginBottom: '0.75rem' }}>
              {t.pricingTitle1}<br />
              <span className="landing-hero-gradient-text">{t.pricingTitle2}</span>
            </h2>
            <p style={{ fontSize: '1rem', color: c.textMuted, maxWidth: 500, margin: '0 auto' }}>{t.pricingSub}</p>
          </div>

          <div className="landing-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', maxWidth: 1000, margin: '0 auto' }}>
            {/* NEWBIE plan */}
            <div style={{
              padding: '2rem', borderRadius: 22,
              background: c.cardBg, border: `1px solid ${c.cardBorder}`,
              display: 'flex', flexDirection: 'column',
              transition: 'all 0.3s ease',
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{t.pricingFree}</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                  <span style={{ fontSize: '2.2rem', fontWeight: 800, background: 'linear-gradient(135deg, #00D4FF, #00F5A0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t.pricingFreePrice}</span>
                  <span style={{ fontSize: '0.85rem', color: c.textMuted }}>/{t.pricingFreePeriod}</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: c.textMuted, marginTop: '0.5rem' }}>{t.pricingFreeDesc}</p>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
                {t.pricingFreeFeatures.map((feat, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: c.textSub }}>
                    <CheckCircle2 size={14} style={{ color: '#00C98D', flexShrink: 0 }} /> {feat}
                  </li>
                ))}
              </ul>
              <Link href="/auth" style={{
                padding: '0.75rem', borderRadius: 12, textAlign: 'center', fontWeight: 600,
                fontSize: '0.9rem', textDecoration: 'none', transition: 'all 0.2s',
                color: c.ctaSecColor, background: c.ctaSecBg, border: `1px solid ${c.ctaSecBorder}`,
              }}>
                {t.pricingFreeCta}
              </Link>
            </div>

            {/* HUSTLER plan */}
            <div style={{
              padding: '2rem', borderRadius: 22,
              background: c.cardBg, border: `1px solid ${c.cardBorder}`,
              display: 'flex', flexDirection: 'column',
              transition: 'all 0.3s ease',
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{t.pricingMid}</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                  <span style={{ fontSize: '2.2rem', fontWeight: 800, background: 'linear-gradient(135deg, #a18cd1, #fbc2eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t.pricingMidPrice}</span>
                  <span style={{ fontSize: '0.85rem', color: c.textMuted }}>{t.pricingMidPeriod}</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: c.textMuted, marginTop: '0.5rem' }}>{t.pricingMidDesc}</p>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
                {t.pricingMidFeatures.map((feat, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: c.textSub }}>
                    <CheckCircle2 size={14} style={{ color: '#a18cd1', flexShrink: 0 }} /> {feat}
                  </li>
                ))}
              </ul>
              <Link href="/billing" style={{
                padding: '0.75rem', borderRadius: 12, textAlign: 'center', fontWeight: 600,
                fontSize: '0.9rem', textDecoration: 'none', transition: 'all 0.2s',
                color: c.ctaSecColor, background: c.ctaSecBg, border: `1px solid ${c.ctaSecBorder}`,
              }}>
                {t.pricingMidCta}
              </Link>
            </div>

            {/* FULL_POWER plan */}
            <div className="landing-pricing-card-pro landing-card-shine" style={{
              padding: '2rem', borderRadius: 22, position: 'relative',
              background: isDark ? 'rgba(0,212,255,0.03)' : 'rgba(0,180,220,0.03)',
              border: isDark ? '1.5px solid rgba(0,212,255,0.2)' : '1.5px solid rgba(0,180,220,0.25)',
              display: 'flex', flexDirection: 'column',
              boxShadow: isDark ? '0 0 40px rgba(0,212,255,0.06)' : '0 0 30px rgba(0,180,220,0.06)',
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}>
              <span className="landing-badge-pulse" style={{
                position: 'absolute', top: '-0.6rem', right: '1.5rem',
                padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700,
                background: 'linear-gradient(135deg, #00D4FF, #00F5A0)', color: '#060B18',
              }}>
                {t.pricingProBadge}
              </span>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{t.pricingPro}</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                  <span style={{ fontSize: '2.2rem', fontWeight: 800, background: 'linear-gradient(135deg, #00D4FF, #00F5A0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t.pricingProPrice}</span>
                  <span style={{ fontSize: '0.85rem', color: c.textMuted }}>{t.pricingProPeriod}</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: c.textMuted, marginTop: '0.5rem' }}>{t.pricingProDesc}</p>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
                {t.pricingProFeatures.map((feat, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: c.textSub }}>
                    <CheckCircle2 size={14} style={{ color: '#00D4FF', flexShrink: 0 }} /> {feat}
                  </li>
                ))}
              </ul>
              <Link href="/billing" style={{
                padding: '0.75rem', borderRadius: 12, textAlign: 'center', fontWeight: 700,
                fontSize: '0.9rem', textDecoration: 'none', transition: 'all 0.2s',
                color: '#060B18', background: 'linear-gradient(135deg, #00D4FF, #00F5A0)',
                boxShadow: c.heroBtnShadow,
              }}>
                {t.pricingProCta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section style={{ padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.3rem 0.85rem', borderRadius: 999, fontSize: '0.75rem',
              background: isDark ? 'rgba(246,211,101,0.08)' : 'rgba(200,170,60,0.08)',
              border: isDark ? '1px solid rgba(246,211,101,0.15)' : '1px solid rgba(200,170,60,0.18)',
              color: isDark ? '#f6d365' : '#b8960a', fontWeight: 600,
            }}>
              <MessageSquare size={12} /> {t.faqBadge}
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', marginTop: '0.85rem' }}>
              {t.faqTitle1}<br />
              <span style={{ background: 'linear-gradient(135deg, #f6d365, #fda085)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t.faqTitle2}</span>
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {t.faqs.map((faq, i) => (
              <div key={i} style={{
                borderRadius: 14, overflow: 'hidden',
                background: openFaq === i ? c.faqActiveBg : c.faqBg,
                border: `1px solid ${openFaq === i ? (isDark ? 'rgba(0,212,255,0.12)' : 'rgba(0,180,220,0.15)') : c.faqBorder}`,
                transition: 'all 0.2s',
              }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                  width: '100%', padding: '1rem 1.25rem', background: 'none', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 600,
                  color: c.text, textAlign: 'left',
                }}>
                  {faq.q}
                  <ChevronDown size={16} style={{
                    color: c.textMuted, flexShrink: 0, marginLeft: '0.5rem',
                    transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }} />
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 1.25rem 1rem', fontSize: '0.85rem', color: c.textMuted, lineHeight: 1.65, animation: 'fadeIn 0.2s ease' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section style={{ padding: '5rem 1.5rem', textAlign: 'center', background: c.ctaSectionBg, position: 'relative', overflow: 'hidden' }}>
        {/* Animated grid background */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(circle, ${isDark ? 'rgba(0,212,255,0.02)' : 'rgba(0,150,200,0.02)'} 1px, transparent 1px)`, backgroundSize: '30px 30px', pointerEvents: 'none' }} />
        <div className="landing-blob" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 700, height: 500, background: c.ctaGlow, pointerEvents: 'none', filter: 'blur(60px)' }} />
        {/* Extra floating orbs */}
        <div className="landing-float" style={{ position: 'absolute', top: '20%', left: '10%', width: 150, height: 150, borderRadius: '50%', background: isDark ? 'rgba(167,139,250,0.04)' : 'rgba(140,120,190,0.04)', filter: 'blur(30px)', pointerEvents: 'none' }} />
        <div className="landing-float-delay" style={{ position: 'absolute', bottom: '20%', right: '10%', width: 120, height: 120, borderRadius: '50%', background: isDark ? 'rgba(0,245,160,0.04)' : 'rgba(0,200,140,0.04)', filter: 'blur(25px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 650, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '1rem' }}>
            {t.ctaTitle1}<br />
            <span className="landing-hero-gradient-text">{t.ctaTitle2}</span>
          </h2>
          <p style={{ fontSize: '1rem', color: c.textMuted, marginBottom: '1.5rem', lineHeight: 1.65, maxWidth: 500, margin: '0 auto 1.5rem' }}>{t.ctaDesc}</p>

          {/* CTA features list */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
            {t.ctaFeatures.map((f, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: c.textFaint }}>
                <CheckCircle2 size={14} style={{ color: '#00C98D' }} /> {f}
              </span>
            ))}
          </div>

          <Link href="/auth" className="landing-cta-primary" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '1rem 2.5rem', borderRadius: 14, fontSize: '1.05rem', fontWeight: 700,
            color: '#060B18', background: 'linear-gradient(135deg, #00D4FF, #00F5A0)',
            textDecoration: 'none', boxShadow: c.ctaBtnShadow, transition: 'all 0.25s ease',
            animation: 'ctaGlow 3s ease-in-out infinite',
          }}>
            {t.ctaBtn} <ArrowRight size={18} />
          </Link>
          <p style={{ fontSize: '0.73rem', color: c.textUltraFaint, marginTop: '1rem' }}>{t.ctaNote}</p>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ padding: '3rem 2rem 2rem', borderTop: c.footerBorder, background: c.footerBg }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          {/* Top */}
          <div className="landing-footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
            {/* Brand column */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Image src={brand.logoPath} alt={brand.name} width={26} height={26} style={{ objectFit: 'contain' }} />
                <span style={{ fontSize: '1rem', fontWeight: 800, background: 'linear-gradient(135deg, #00D4FF, #00F5A0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{brand.name}</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: c.textMuted, lineHeight: 1.6, maxWidth: 260 }}>{t.footerTagline}</p>
            </div>
            {/* Links */}
            {[
              { title: t.footerProduct, links: t.footerProductLinks },
              { title: t.footerSupport, links: t.footerSupportLinks },
              { title: t.footerLegal, links: t.footerLegalLinks },
            ].map((col, i) => (
              <div key={i}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: c.textSub, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col.title}</h4>
                {col.links.map((link, j) => (
                  <a key={j} href="#" style={{ display: 'block', fontSize: '0.78rem', color: c.textMuted, textDecoration: 'none', marginBottom: '0.5rem', transition: 'color 0.2s' }}>{link}</a>
                ))}
              </div>
            ))}
          </div>
          {/* Bottom */}
          <div className="landing-footer-bottom" style={{ borderTop: c.footerBorder, paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '0.72rem', color: c.textUltraFaint }}>{brand.footer.copyright}</p>
            <p style={{ fontSize: '0.72rem', color: c.textUltraFaint }}>{t.footerMadeWith} ❤️ {t.footerForStudents}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
