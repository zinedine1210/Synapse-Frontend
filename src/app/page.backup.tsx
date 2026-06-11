'use client';

import Image from 'next/image';
import Link from 'next/link';
import { brand } from '@/config/brand';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Sparkles, BookOpen, Brain, FileText, Users, BarChart3,
  ChevronRight, Zap, MessageSquare, ArrowRight, Star,
  CheckCircle2, GraduationCap, Layers, Target, Sun, Moon, Globe,
  Shield, Wallet, ClipboardList, PenTool, Vote, Bell,
  FolderOpen, ChevronDown, Play, Monitor,
} from 'lucide-react';

/* ═══════════════════════════════════════════
   i18n
   ═══════════════════════════════════════════ */
type Lang = 'id' | 'en';
const T = {
  id: {
    badge: 'Platform Akademik Berbasis AI #1 di Indonesia',
    heroTitle1: 'Revolusi Cara',
    heroTitle2: 'Mahasiswa Belajar',
    heroTitle3: 'dengan AI',
    heroDesc: 'Rangkum materi dalam hitungan detik, latihan kuis adaptif, prediksi soal ujian, forum diskusi real-time, dan kelola kelas — semua dalam satu platform cerdas.',
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
      { title: 'AI yang Benar-Benar Membantu', desc: 'Bukan sekadar chatbot. AI kami memahami materi kuliahmu, membuat rangkuman terstruktur, dan menyesuaikan latihan soal dengan kelemahanmu.', icon: 'brain' },
      { title: 'Kolaborasi Tim Tanpa Batas', desc: 'Forum diskusi per topik, kelompok belajar, kas kolektif, pembagian tugas otomatis — semua terintegrasi tanpa perlu WhatsApp terpisah.', icon: 'users' },
      { title: 'Terstruktur & Rapi', desc: '16 sesi pertemuan per kelas, materi terorganisir, tugas terlacak, dan progress jelas. Tidak ada lagi file berantakan di Google Drive.', icon: 'folder' },
    ],

    // Features
    featBadge: 'Fitur Lengkap',
    featTitle1: 'Semua yang Kamu Butuhkan',
    featTitle2: 'untuk Sukses di Kampus',
    featSub: 'Fitur-fitur yang dirancang khusus untuk kehidupan akademik mahasiswa Indonesia.',
    features: [
      { title: 'AI Summarizer', desc: 'Upload PDF atau gambar materi kuliah, dan AI akan membuat rangkuman cerdas dengan poin-poin utama dalam hitungan detik. Hemat berjam-jam waktu belajar.', tag: 'AI' },
      { title: 'Kuis Adaptif', desc: 'AI menganalisis kelemahanmu dari hasil kuis sebelumnya dan membuat soal yang tepat sasaran. Semakin sering latihan, semakin pintar AI-nya.', tag: 'AI' },
      { title: 'Prediksi Ujian', desc: 'Berdasarkan seluruh materi yang sudah diupload, AI memprediksi soal-soal yang kemungkinan besar keluar di ujian. Persiapan jadi terarah.', tag: 'AI' },
      { title: '16 Sesi Pertemuan', desc: 'Struktur perkuliahan lengkap dengan 16 pertemuan. Setiap sesi bisa berisi materi, tugas, kuis, dan catatan. Semua terorganisir rapi.', tag: 'Kelas' },
      { title: 'Forum Diskusi Real-time', desc: 'Ruang diskusi per kelas dengan pembahasan terpisah, voting, rich text editor, indikator pesan belum dibaca, dan pencarian. Seperti Slack untuk kuliah.', tag: 'Sosial' },
      { title: 'Canvas Kolaboratif', desc: 'Setiap pembahasan di forum punya canvas — catatan bersama yang bisa diedit siapa saja dengan rich text editor. Cocok untuk notulensi rapat kelompok.', tag: 'Sosial' },
      { title: 'Kelompok Belajar', desc: 'Buat kelompok belajar dalam kelas, bagi tugas per kelompok, dan lihat anggota masing-masing kelompok. Tugas kelompok hanya terlihat oleh kelompok terkait.', tag: 'Tim' },
      { title: 'Kas Kolektif', desc: 'Kelola kas kelas secara transparan — catat pemasukan, pengeluaran, dan saldo. Semua anggota bisa melihat histori transaksi.', tag: 'Tim' },
      { title: 'Manajemen Tugas', desc: 'Buat tugas dengan deadline, assign ke individu atau kelompok, dan pantau progress pengumpulan. Dosen tahu siapa yang sudah dan belum mengumpulkan.', tag: 'Kelas' },
      { title: 'Export PDF B5', desc: 'Semua rangkuman AI bisa di-export ke PDF format B5 — siap cetak untuk belajar offline. Layout profesional, langsung bisa dijilid.', tag: 'Tools' },
      { title: 'Hak Akses & Peran', desc: 'Sistem permission yang fleksibel — atur siapa yang bisa membuat kuis, mengelola forum, menghapus materi, atau mengedit canvas per anggota.', tag: 'Admin' },
      { title: 'Notifikasi Cerdas', desc: 'Dapatkan notifikasi untuk tugas baru, deadline mendekat, dan pesan belum dibaca. Tidak pernah ketinggalan informasi penting lagi.', tag: 'Tools' },
    ],

    // How it works
    howBadge: 'Cara Kerja',
    howTitle1: 'Empat Langkah Menuju',
    howTitle2: 'Nilai Sempurna',
    howSub: 'Mulai dari nol hingga siap ujian — semuanya bisa dilakukan dalam hitungan menit.',
    steps: [
      { num: '01', title: 'Buat atau Gabung Kelas', desc: 'Buat kelas baru untuk mata kuliahmu, atau gabung kelas yang sudah ada menggunakan kode undangan. Atur nama kelas, deskripsi, dan password jika perlu.', detail: 'Mendukung multi-kelas' },
      { num: '02', title: 'Upload Materi Kuliah', desc: 'Upload file PDF atau gambar materi kuliah ke setiap sesi pertemuan. Sistem menyimpan semua file di cloud, aman dan bisa diakses kapan saja.', detail: 'PDF, Gambar, Multi-file' },
      { num: '03', title: 'AI Memproses Otomatis', desc: 'AI merangkum materi, mengekstrak poin-poin penting, membuat kuis latihan, dan memprediksi soal ujian — semuanya otomatis tanpa perlu setting apapun.', detail: 'Powered by Gemini' },
      { num: '04', title: 'Belajar & Kolaborasi', desc: 'Review rangkuman, latihan kuis adaptif, diskusi di forum, bagi tugas kelompok, dan pantau progress belajarmu. Siap hadapi ujian dengan percaya diri!', detail: 'Semua dalam satu app' },
    ],

    // Showcase section
    showcaseBadge: 'Tampilan Aplikasi',
    showcaseTitle1: 'Dirancang untuk',
    showcaseTitle2: 'Mahasiswa Modern',
    showcaseSub: 'Interface yang bersih, responsif, dan mendukung dark mode. Semua fitur bisa diakses dalam hitungan klik.',
    showcaseItems: [
      { title: 'Dashboard Kelas', desc: 'Lihat semua kelasmu, deadline mendekat, dan aktivitas terbaru dalam satu halaman.' },
      { title: 'Pertemuan Terstruktur', desc: '16 sesi pertemuan dengan materi, tugas, dan kuis yang terorganisir rapi.' },
      { title: 'Forum Interaktif', desc: 'Diskusi real-time dengan pembahasan terpisah, voting, dan indikator pesan baru.' },
      { title: 'AI Rangkuman', desc: 'Rangkuman otomatis dari materi kuliah, siap review atau export ke PDF.' },
    ],

    // Testimonials
    testiBadge: 'Testimoni',
    testiTitle1: 'Dicintai Mahasiswa',
    testiTitle2: 'di Seluruh Indonesia',
    testiSub: 'Lihat apa kata mereka yang sudah merasakan kemudahan belajar dengan Synapse.',
    testimonials: [
      { name: 'Rina Salsabila', major: 'Manajemen — Universitas Indonesia', text: 'Synapse bikin rangkuman materi jadi cepat banget! Dulu aku butuh 2-3 jam buat bikin catatan, sekarang AI-nya bisa dalam hitungan detik. Plus fitur export PDF-nya keren, bisa langsung cetak buat UAS.', avatar: 'R', rating: 5 },
      { name: 'Andi Pratama', major: 'Teknik Informatika — ITB', text: 'Fitur kuis adaptif-nya luar biasa. AI-nya tau persis mana yang aku kurang paham dan terus kasih soal di topik itu sampai aku benar-benar mengerti. Nilai UTS naik drastis!', avatar: 'A', rating: 5 },
      { name: 'Maya Lestari', major: 'Akuntansi — Binus University', text: 'Forum diskusinya lengkap banget — bisa bikin thread terpisah per topik, ada voting, bahkan canvas buat notulen. Gak perlu lagi buat grup WhatsApp untuk setiap mata kuliah.', avatar: 'M', rating: 5 },
      { name: 'Dimas Arya', major: 'Hukum — Universitas Gadjah Mada', text: 'Prediksi ujian-nya surprisingly accurate. 7 dari 10 soal yang diprediksi AI beneran keluar di UAS. Ini game changer buat persiapan ujian!', avatar: 'D', rating: 5 },
      { name: 'Sari Dewi', major: 'Kedokteran — Unair', text: 'Sebagai mahasiswa kedokteran, materi kami sangat banyak. Synapse bikin review materi jadi structured dan efisien. Fitur kelompoknya juga membantu buat PBL.', avatar: 'S', rating: 5 },
      { name: 'Rizky Fauzan', major: 'Sistem Informasi — UGM', text: 'Kas kolektif-nya berguna banget buat kelola uang kas kelas. Transparan, semua bisa lihat, dan gak perlu spreadsheet terpisah lagi. Manajemen tugas-nya juga oke.', avatar: 'F', rating: 5 },
    ],

    // FAQ
    faqBadge: 'FAQ',
    faqTitle1: 'Pertanyaan',
    faqTitle2: 'yang Sering Ditanyakan',
    faqs: [
      { q: 'Apakah Synapse benar-benar gratis?', a: 'Ya! Kamu bisa menggunakan semua fitur utama secara gratis. Kami juga menyediakan paket Pro untuk fitur premium seperti AI tanpa batas dan penyimpanan lebih besar.' },
      { q: 'AI-nya menggunakan model apa?', a: 'Synapse menggunakan Google Gemini AI (gemini-1.5-flash) yang telah dioptimasi khusus untuk konten akademik berbahasa Indonesia dan Inggris.' },
      { q: 'Apakah data materi kuliah saya aman?', a: 'Tentu! Semua file disimpan di Supabase Storage yang terenkripsi. Hanya anggota kelas yang bisa mengakses materi kelas tersebut.' },
      { q: 'Bisa digunakan untuk jurusan apa saja?', a: 'Synapse dirancang untuk semua jurusan — dari Teknik, Kedokteran, Hukum, Ekonomi, hingga Seni. AI kami bisa memproses materi dalam berbagai bidang ilmu.' },
      { q: 'Berapa jumlah anggota per kelas?', a: 'Tidak ada batasan jumlah anggota per kelas. Kamu bisa mengundang seluruh angkatan jika diperlukan.' },
      { q: 'Apakah bisa diakses dari HP?', a: 'Ya, Synapse fully responsive dan bisa diakses dari browser HP, tablet, atau laptop. Tidak perlu download aplikasi tambahan.' },
    ],

    // CTA
    ctaTitle1: 'Siap Revolusi',
    ctaTitle2: 'Cara Belajarmu?',
    ctaDesc: 'Bergabung dengan ribuan mahasiswa yang sudah merasakan kemudahan belajar dengan AI. Gratis, tanpa batas waktu, tanpa kartu kredit.',
    ctaBtn: 'Mulai Gratis Sekarang',
    ctaNote: 'Gratis selamanya • Setup dalam 30 detik • Tanpa kartu kredit',
    ctaFeatures: ['AI Summarizer & Kuis', 'Forum Diskusi Real-time', 'Prediksi Soal Ujian', 'Manajemen Tugas & Kelompok'],

    // Footer
    footerProduct: 'Produk',
    footerProductLinks: ['Fitur', 'Cara Kerja', 'Harga'],
    footerSupport: 'Dukungan',
    footerSupportLinks: ['FAQ', 'Hubungi Kami', 'Dokumentasi'],
    footerLegal: 'Legal',
    footerLegalLinks: ['Privasi', 'Ketentuan', 'Keamanan'],
    footerTagline: 'Platform akademik berbasis AI untuk mahasiswa Indonesia.',
    footerMadeWith: 'Dibuat dengan',
    footerForStudents: 'untuk mahasiswa Indonesia',
  },
  en: {
    badge: '#1 AI-Powered Academic Platform in Indonesia',
    heroTitle1: 'Revolutionize How',
    heroTitle2: 'Students Learn',
    heroTitle3: 'with AI',
    heroDesc: 'Summarize materials in seconds, adaptive quizzes, exam predictions, real-time discussion forums, and class management — all in one smart platform.',
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
    highlightSub: 'Stop switching between apps. Synapse unifies everything you need for college in one elegant dashboard.',
    highlights: [
      { title: 'AI That Actually Helps', desc: 'Not just a chatbot. Our AI understands your course materials, creates structured summaries, and adapts quizzes to your weaknesses.', icon: 'brain' },
      { title: 'Seamless Team Collaboration', desc: 'Topic-based forums, study groups, collective funds, auto task assignments — all integrated without needing separate WhatsApp groups.', icon: 'users' },
      { title: 'Structured & Organized', desc: '16 sessions per class, organized materials, tracked assignments, and clear progress. No more scattered files in Google Drive.', icon: 'folder' },
    ],

    featBadge: 'Full Features',
    featTitle1: 'Everything You Need',
    featTitle2: 'to Succeed in College',
    featSub: 'Features designed specifically for the academic life of Indonesian students.',
    features: [
      { title: 'AI Summarizer', desc: 'Upload PDF or image course materials, and AI creates smart summaries with key points in seconds. Save hours of study time.', tag: 'AI' },
      { title: 'Adaptive Quiz', desc: 'AI analyzes your weaknesses from previous quiz results and creates targeted questions. The more you practice, the smarter the AI gets.', tag: 'AI' },
      { title: 'Exam Prediction', desc: 'Based on all uploaded materials, AI predicts questions most likely to appear on exams. Preparation becomes focused.', tag: 'AI' },
      { title: '16 Class Sessions', desc: 'Complete course structure with 16 sessions. Each session can contain materials, tasks, quizzes, and notes. Everything organized neatly.', tag: 'Class' },
      { title: 'Real-time Discussion Forum', desc: 'Discussion per class with separate threads, voting, rich text editor, unread indicators, and search. Like Slack for college.', tag: 'Social' },
      { title: 'Collaborative Canvas', desc: 'Each forum discussion has a canvas — shared notes editable by anyone with a rich text editor. Perfect for meeting notes.', tag: 'Social' },
      { title: 'Study Groups', desc: 'Create study groups in class, assign tasks per group, and view members. Group tasks are only visible to the relevant group.', tag: 'Team' },
      { title: 'Collective Funds', desc: 'Manage class funds transparently — record income, expenses, and balance. All members can view transaction history.', tag: 'Team' },
      { title: 'Task Management', desc: 'Create tasks with deadlines, assign to individuals or groups, and track submission progress. Know who has and hasn\'t submitted.', tag: 'Class' },
      { title: 'Export PDF B5', desc: 'All AI summaries can be exported to B5 PDF format — ready to print for offline study. Professional layout, ready to bind.', tag: 'Tools' },
      { title: 'Access Control & Roles', desc: 'Flexible permission system — control who can create quizzes, manage forums, delete materials, or edit canvas per member.', tag: 'Admin' },
      { title: 'Smart Notifications', desc: 'Get notified for new tasks, approaching deadlines, and unread messages. Never miss important information again.', tag: 'Tools' },
    ],

    howBadge: 'How It Works',
    howTitle1: 'Four Steps to',
    howTitle2: 'Perfect Grades',
    howSub: 'From zero to exam-ready — everything can be done in minutes.',
    steps: [
      { num: '01', title: 'Create or Join a Class', desc: 'Create a new class for your course, or join an existing one using an invite code. Set the class name, description, and password if needed.', detail: 'Multi-class support' },
      { num: '02', title: 'Upload Course Materials', desc: 'Upload PDF or image course materials to each session. The system stores all files in the cloud, safe and accessible anytime.', detail: 'PDF, Images, Multi-file' },
      { num: '03', title: 'AI Processes Automatically', desc: 'AI summarizes materials, extracts key points, creates practice quizzes, and predicts exam questions — all automatically with zero configuration.', detail: 'Powered by Gemini' },
      { num: '04', title: 'Learn & Collaborate', desc: 'Review summaries, practice adaptive quizzes, discuss in forums, divide group tasks, and track your learning progress. Ace your exams with confidence!', detail: 'All in one app' },
    ],

    showcaseBadge: 'App Preview',
    showcaseTitle1: 'Designed for',
    showcaseTitle2: 'Modern Students',
    showcaseSub: 'Clean interface, responsive, and dark mode support. All features accessible in a few clicks.',
    showcaseItems: [
      { title: 'Class Dashboard', desc: 'See all your classes, approaching deadlines, and recent activity in one page.' },
      { title: 'Structured Sessions', desc: '16 sessions with organized materials, tasks, and quizzes.' },
      { title: 'Interactive Forum', desc: 'Real-time discussions with separate threads, voting, and new message indicators.' },
      { title: 'AI Summaries', desc: 'Auto-generated summaries from course materials, ready to review or export to PDF.' },
    ],

    testiBadge: 'Testimonials',
    testiTitle1: 'Loved by Students',
    testiTitle2: 'Across Indonesia',
    testiSub: 'See what they have to say about learning with Synapse.',
    testimonials: [
      { name: 'Rina Salsabila', major: 'Management — University of Indonesia', text: 'Synapse makes summarizing super fast! I used to spend 2-3 hours making notes, now the AI does it in seconds. Plus the PDF export is great for printing before exams.', avatar: 'R', rating: 5 },
      { name: 'Andi Pratama', major: 'Computer Science — ITB', text: 'The adaptive quiz feature is incredible. The AI knows exactly which topics I struggle with and keeps quizzing me on them until I truly understand. My midterm scores improved dramatically!', avatar: 'A', rating: 5 },
      { name: 'Maya Lestari', major: 'Accounting — Binus University', text: 'The discussion forum is super complete — separate threads per topic, voting, even a canvas for meeting notes. No need to create WhatsApp groups for every course anymore.', avatar: 'M', rating: 5 },
      { name: 'Dimas Arya', major: 'Law — Gadjah Mada University', text: 'The exam prediction is surprisingly accurate. 7 out of 10 predicted questions actually appeared on my final exam. This is a game changer for exam prep!', avatar: 'D', rating: 5 },
      { name: 'Sari Dewi', major: 'Medicine — Airlangga University', text: 'As a medical student, our materials are enormous. Synapse makes reviewing structured and efficient. The group feature also helps a lot for PBL sessions.', avatar: 'S', rating: 5 },
      { name: 'Rizky Fauzan', major: 'Information Systems — UGM', text: 'The collective funds feature is super useful for managing class treasury. Transparent, everyone can see, no separate spreadsheets needed. Task management is also great.', avatar: 'F', rating: 5 },
    ],

    faqBadge: 'FAQ',
    faqTitle1: 'Frequently Asked',
    faqTitle2: 'Questions',
    faqs: [
      { q: 'Is Synapse really free?', a: 'Yes! You can use all core features for free. We also offer a Pro plan for premium features like unlimited AI and more storage.' },
      { q: 'What AI model does it use?', a: 'Synapse uses Google Gemini AI (gemini-1.5-flash) optimized specifically for academic content in Indonesian and English.' },
      { q: 'Is my course data safe?', a: 'Absolutely! All files are stored in encrypted Supabase Storage. Only class members can access that class\'s materials.' },
      { q: 'Can it be used for any major?', a: 'Synapse is designed for all majors — from Engineering, Medicine, Law, Economics, to Arts. Our AI can process materials across fields.' },
      { q: 'How many members per class?', a: 'There is no limit on members per class. You can invite your entire batch if needed.' },
      { q: 'Can I access it from my phone?', a: 'Yes, Synapse is fully responsive and accessible from any phone, tablet, or laptop browser. No additional app download needed.' },
    ],

    ctaTitle1: 'Ready to Revolutionize',
    ctaTitle2: 'Your Learning?',
    ctaDesc: 'Join thousands of students who already experience the ease of learning with AI. Free, no time limits, no credit card.',
    ctaBtn: 'Start Free Now',
    ctaNote: 'Free forever • 30s setup • No credit card',
    ctaFeatures: ['AI Summarizer & Quiz', 'Real-time Forum', 'Exam Prediction', 'Task & Group Management'],

    footerProduct: 'Product',
    footerProductLinks: ['Features', 'How It Works', 'Pricing'],
    footerSupport: 'Support',
    footerSupportLinks: ['FAQ', 'Contact Us', 'Documentation'],
    footerLegal: 'Legal',
    footerLegalLinks: ['Privacy', 'Terms', 'Security'],
    footerTagline: 'AI-powered academic platform for Indonesian students.',
    footerMadeWith: 'Made with',
    footerForStudents: 'for Indonesian students',
  },
};

const FEAT_META: { icon: typeof Brain; color: string; gradient: string }[] = [
  { icon: Brain, color: '#00D4FF', gradient: 'linear-gradient(135deg, #00D4FF, #0096FF)' },
  { icon: Target, color: '#00F5A0', gradient: 'linear-gradient(135deg, #00F5A0, #00D68F)' },
  { icon: BarChart3, color: '#f093fb', gradient: 'linear-gradient(135deg, #f093fb, #f5576c)' },
  { icon: BookOpen, color: '#a18cd1', gradient: 'linear-gradient(135deg, #a18cd1, #fbc2eb)' },
  { icon: MessageSquare, color: '#4facfe', gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
  { icon: PenTool, color: '#43e97b', gradient: 'linear-gradient(135deg, #43e97b, #38f9d7)' },
  { icon: Users, color: '#fa709a', gradient: 'linear-gradient(135deg, #fa709a, #fee140)' },
  { icon: Wallet, color: '#f6d365', gradient: 'linear-gradient(135deg, #f6d365, #fda085)' },
  { icon: ClipboardList, color: '#667eea', gradient: 'linear-gradient(135deg, #667eea, #764ba2)' },
  { icon: FileText, color: '#FF6B6B', gradient: 'linear-gradient(135deg, #FF6B6B, #ee5a24)' },
  { icon: Shield, color: '#a29bfe', gradient: 'linear-gradient(135deg, #a29bfe, #6c5ce7)' },
  { icon: Bell, color: '#fdcb6e', gradient: 'linear-gradient(135deg, #fdcb6e, #e17055)' },
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
};

/* ═══ Hooks ═══ */

function useCounter(end: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true); }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!started) return;
    let startTs: number;
    const tick = (t: number) => {
      if (!startTs) startTs = t;
      const p = Math.min((t - startTs) / duration, 1);
      setCount(Math.floor(p * end));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, end, duration]);
  return { count, ref };
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
  const stats2 = useCounter(12, 1800);
  const stats3 = useCounter(98, 2000);
  const stats4 = useCounter(10, 1200);

  const heroAnim = useInView(0.1);
  const highlightAnim = useInView();
  const featAnim = useInView();
  const howAnim = useInView();
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

      {/* ═══ NAVBAR ═══ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0.7rem 2rem',
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
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          {[
            { label: t.navFeatures, href: '#features' },
            { label: t.navHowItWorks, href: '#how-it-works' },
            { label: t.navTestimonials, href: '#testimonials' },
          ].map(link => (
            <a key={link.href} href={link.href} style={{ fontSize: '0.8rem', fontWeight: 500, color: c.textMuted, textDecoration: 'none', transition: 'color 0.2s' }}>{link.label}</a>
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
          <Link href="/auth" style={{ padding: '0.45rem 1.1rem', borderRadius: 10, fontSize: '0.8rem', fontWeight: 600, color: c.ctaSecColor, background: 'none', border: 'none', textDecoration: 'none', transition: 'opacity 0.2s' }}>{t.navLogin}</Link>
          <Link href="/auth" style={{ padding: '0.45rem 1.1rem', borderRadius: 10, fontSize: '0.8rem', fontWeight: 700, color: '#060B18', background: 'linear-gradient(135deg, #00D4FF, #00F5A0)', textDecoration: 'none', boxShadow: c.navRegShadow, transition: 'all 0.2s' }}>{t.navRegister}</Link>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section ref={heroAnim.ref} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '7rem 1.5rem 4rem', position: 'relative' }}>
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: '-30%', left: '30%', width: 900, height: 900, borderRadius: '50%', background: c.glowOrb1, pointerEvents: 'none', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '0%', right: '-15%', width: 600, height: 600, borderRadius: '50%', background: c.glowOrb2, pointerEvents: 'none', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', top: '20%', left: '-10%', width: 400, height: 400, borderRadius: '50%', background: isDark ? 'radial-gradient(circle, rgba(161,140,209,0.04) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(140,120,190,0.04) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(20px)' }} />

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
        <h1 style={{
          fontSize: 'clamp(2.5rem, 6.5vw, 4.8rem)', fontWeight: 800, letterSpacing: '-0.04em',
          lineHeight: 1.08, maxWidth: 860, marginBottom: '1.5rem',
          opacity: heroAnim.inView ? 1 : 0, transform: heroAnim.inView ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
        }}>
          <span style={{ color: c.subtitleColor }}>{t.heroTitle1}</span><br />
          <span style={{ background: 'linear-gradient(135deg, #00D4FF, #00F5A0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t.heroTitle2}</span><br />
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
          }}>
            {t.ctaPrimary} <ArrowRight size={16} />
          </Link>
          <a href="#features" style={{
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
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {[
            { counter: stats1, suffix: '', label: t.statSessions, sub: t.statSessionsSub, gradient: 'linear-gradient(135deg, #00D4FF, #0096FF)' },
            { counter: stats2, suffix: '+', label: t.statFeatures, sub: t.statFeaturesSub, gradient: 'linear-gradient(135deg, #00F5A0, #00D68F)' },
            { counter: stats3, suffix: '%', label: t.statAccuracy, sub: t.statAccuracySub, gradient: 'linear-gradient(135deg, #f093fb, #f5576c)' },
            { counter: stats4, suffix: 'x', label: t.statFaster, sub: t.statFasterSub, gradient: 'linear-gradient(135deg, #f6d365, #fda085)' },
          ].map((stat, i) => (
            <div key={i} ref={stat.counter.ref} style={{
              padding: '1.5rem 1rem', borderRadius: 16, textAlign: 'center',
              background: c.statCardBg, border: `1px solid ${c.statCardBorder}`,
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 800, background: stat.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1 }}>
                {stat.counter.count}{stat.suffix}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: c.textSub, marginTop: '0.3rem' }}>{stat.label}</div>
              <div style={{ fontSize: '0.7rem', color: c.textMuted, marginTop: '0.1rem' }}>{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ WHY SYNAPSE ═══ */}
      <section ref={highlightAnim.ref} style={{ padding: '5rem 1.5rem', background: c.sectionAltBg }}>
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
              <span style={{ background: 'linear-gradient(135deg, #00D4FF, #00F5A0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t.highlightTitle2}</span>
            </h2>
            <p style={{ fontSize: '1rem', color: c.textMuted, maxWidth: 600, margin: '0 auto', lineHeight: 1.65 }}>{t.highlightSub}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            {t.highlights.map((h, i) => {
              const Icon = HIGHLIGHT_ICONS[i];
              const colors = ['#00D4FF', '#00F5A0', '#a18cd1'];
              return (
                <div key={i} style={{
                  padding: '2rem 1.75rem', borderRadius: 20,
                  background: c.highlightCardBg, border: `1px solid ${c.highlightCardBorder}`,
                  transition: 'all 0.3s ease', cursor: 'default',
                  opacity: highlightAnim.inView ? 1 : 0,
                  transform: highlightAnim.inView ? 'translateY(0)' : 'translateY(30px)',
                  transitionDelay: `${0.1 + i * 0.1}s`,
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
      <section id="features" ref={featAnim.ref} style={{ padding: '5rem 1.5rem' }}>
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
              <span style={{ background: 'linear-gradient(135deg, #00D4FF, #00F5A0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t.featTitle2}</span>
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
                <div key={origIdx} className="card-interactive" style={{
                  padding: '1.5rem', borderRadius: 18,
                  background: c.cardBg, border: `1px solid ${c.cardBorder}`,
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', cursor: 'default',
                  opacity: featAnim.inView ? 1 : 0,
                  transform: featAnim.inView ? 'translateY(0)' : 'translateY(20px)',
                  transitionDelay: `${Math.min(i * 0.05, 0.4)}s`,
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
      <section id="how-it-works" ref={howAnim.ref} style={{ padding: '5rem 1.5rem', background: c.sectionAltBg }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', position: 'relative' }}>
            {/* Connector line */}
            <div style={{ position: 'absolute', top: '3rem', left: '12.5%', right: '12.5%', height: 2, background: `linear-gradient(90deg, transparent, ${c.stepConnector}, ${c.stepConnector}, transparent)`, zIndex: 0 }} />

            {t.steps.map((s, i) => {
              const stepColors = ['#00D4FF', '#00F5A0', '#a18cd1', '#f093fb'];
              return (
                <div key={i} style={{
                  padding: '1.75rem 1.25rem', borderRadius: 18, textAlign: 'center',
                  background: c.cardBg, border: `1px solid ${c.cardBorder}`,
                  position: 'relative', zIndex: 1,
                  opacity: howAnim.inView ? 1 : 0,
                  transform: howAnim.inView ? 'translateY(0)' : 'translateY(30px)',
                  transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 + i * 0.12}s`,
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

      {/* ═══ APP SHOWCASE ═══ */}
      <section ref={showcaseAnim.ref} style={{ padding: '5rem 1.5rem' }}>
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
              <Monitor size={12} /> {t.showcaseBadge}
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', marginTop: '0.85rem', marginBottom: '0.75rem' }}>
              {t.showcaseTitle1}<br />
              <span style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t.showcaseTitle2}</span>
            </h2>
            <p style={{ fontSize: '1rem', color: c.textMuted, maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>{t.showcaseSub}</p>
          </div>

          {/* Mock browser window */}
          <div style={{
            borderRadius: 20, overflow: 'hidden',
            border: `1px solid ${c.cardBorder}`,
            boxShadow: isDark ? '0 20px 80px rgba(0,0,0,0.5)' : '0 20px 60px rgba(0,0,0,0.08)',
            opacity: showcaseAnim.inView ? 1 : 0,
            transform: showcaseAnim.inView ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.98)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
          }}>
            {/* Browser bar */}
            <div style={{
              padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: isDark ? 'rgba(20,28,48,0.9)' : 'rgba(240,242,248,0.9)',
              borderBottom: `1px solid ${c.cardBorder}`,
            }}>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {['#ff5f57', '#febc2e', '#28c840'].map((color, i) => (
                  <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                ))}
              </div>
              <div style={{
                flex: 1, padding: '0.3rem 0.8rem', borderRadius: 8, fontSize: '0.7rem',
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                color: c.textMuted, fontFamily: 'monospace',
              }}>
                synapse.dev/dashboard
              </div>
            </div>
            {/* Content area with feature cards */}
            <div style={{
              padding: '2.5rem 2rem',
              background: isDark ? 'linear-gradient(135deg, rgba(10,16,32,0.95), rgba(16,22,40,0.95))' : 'linear-gradient(135deg, rgba(248,250,252,0.95), rgba(240,244,248,0.95))',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                {t.showcaseItems.map((item, i) => {
                  const showcaseColors = ['#00D4FF', '#a18cd1', '#4facfe', '#00F5A0'];
                  const showcaseIcons = [Layers, BookOpen, MessageSquare, Brain];
                  const SIcon = showcaseIcons[i];
                  return (
                    <div key={i} style={{
                      padding: '1.5rem', borderRadius: 16,
                      background: c.showcaseCardBg, border: `1px solid ${c.cardBorder}`,
                      display: 'flex', gap: '1rem', alignItems: 'flex-start',
                    }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                        background: isDark ? `${showcaseColors[i]}10` : `${showcaseColors[i]}08`,
                        border: `1px solid ${isDark ? `${showcaseColors[i]}20` : `${showcaseColors[i]}15`}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <SIcon size={20} style={{ color: showcaseColors[i] }} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.3rem' }}>{item.title}</h4>
                        <p style={{ fontSize: '0.78rem', color: c.textMuted, lineHeight: 1.55, margin: 0 }}>{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section id="testimonials" ref={testiAnim.ref} style={{ padding: '5rem 1.5rem', background: c.sectionAltBg }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {t.testimonials.map((testi, i) => {
              const avatarColors = [
                ['#667eea', '#764ba2'], ['#4facfe', '#00f2fe'], ['#fa709a', '#fee140'],
                ['#00D4FF', '#00F5A0'], ['#a18cd1', '#fbc2eb'], ['#43e97b', '#38f9d7'],
              ];
              const [c1, c2] = avatarColors[i % avatarColors.length];
              return (
                <div key={i} className="card-interactive" style={{
                  padding: '1.5rem', borderRadius: 18,
                  background: c.cardBg, border: `1px solid ${c.cardBorder}`,
                  opacity: testiAnim.inView ? 1 : 0,
                  transform: testiAnim.inView ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 + i * 0.08}s`,
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
      <section style={{ padding: '5rem 1.5rem', textAlign: 'center', background: c.ctaSectionBg, position: 'relative' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 700, height: 500, borderRadius: '50%', background: c.ctaGlow, pointerEvents: 'none', filter: 'blur(40px)' }} />
        <div style={{ position: 'relative', maxWidth: 650, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '1rem' }}>
            {t.ctaTitle1}<br />
            <span style={{ background: 'linear-gradient(135deg, #00D4FF, #00F5A0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t.ctaTitle2}</span>
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

          <Link href="/auth" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '1rem 2.5rem', borderRadius: 14, fontSize: '1.05rem', fontWeight: 700,
            color: '#060B18', background: 'linear-gradient(135deg, #00D4FF, #00F5A0)',
            textDecoration: 'none', boxShadow: c.ctaBtnShadow, transition: 'all 0.25s ease',
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
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
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
          <div style={{ borderTop: c.footerBorder, paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '0.72rem', color: c.textUltraFaint }}>{brand.footer.copyright}</p>
            <p style={{ fontSize: '0.72rem', color: c.textUltraFaint }}>{t.footerMadeWith} ❤️ {t.footerForStudents}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
