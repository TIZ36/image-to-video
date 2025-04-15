'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// Define supported languages
export type Language = 'en' | 'zh' | 'id';

// Define language names for display
export const languageNames = {
  en: 'English',
  zh: '简体中文',
  id: 'Bahasa Indonesia'
};

// Define translations interface
interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

// Context type
interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

// Default context value
const defaultLanguageContext: LanguageContextType = {
  language: 'en',
  setLanguage: () => {},
  t: () => '',
};

// Create context
export const LanguageContext = createContext<LanguageContextType>(defaultLanguageContext);

// Translations
const translations: Translations = {
  en: {
    // Common
    'choose.language': 'Choose Language',
    'add.image': 'Add Image',
    'upload': 'Upload',
    'uploading': 'Uploading...',
    'uploaded': 'Uploaded',
    'drag.drop.image': 'Click or drag and drop images here',
    'upload.all.images': 'Upload All Images',
    'select.image': 'Select Image',
    'no.images': 'No images available',
    'create.project': 'Create Project',
    'delete': 'Delete',
    
    // Error messages
    'load.failed': 'Failed to load project images',
    'upload.failed': 'Upload failed',
    'image.only': 'Only image files can be uploaded',
    
    // Project related
    'new.project': 'New Product Display Project',
    'from.image.upload': 'Created from image upload',
    
    // Page elements
    'app.title': 'Product Sales Video Generator',
    'app.subtitle': 'Turn your product images into compelling sales videos with AI',
    'product.image': 'Product Image',
    'marketing.copy': 'Marketing Copy',
    'sales.video': 'Sales Video',
    'loading.project': 'Loading project...',
    'select.create.project': 'Select or create a project',
    'project.will.display': 'Your selected project will display here',
  },
  zh: {
    // Common
    'choose.language': '选择语言',
    'add.image': '添加图片',
    'upload': '上传',
    'uploading': '上传中...',
    'uploaded': '已上传',
    'drag.drop.image': '点击或拖放图片至此',
    'upload.all.images': '上传所有图片',
    'select.image': '选择要使用的图片',
    'no.images': '没有可用的图片',
    'create.project': '创建项目',
    'delete': '删除',
    
    // Error messages
    'load.failed': '加载项目图片失败',
    'upload.failed': '上传失败',
    'image.only': '只能上传图片文件',
    
    // Project related
    'new.project': '新产品展示项目',
    'from.image.upload': '从图片上传创建',
    
    // Page elements
    'app.title': '产品销售视频生成器',
    'app.subtitle': '使用AI将您的产品图片转换为引人注目的销售视频',
    'product.image': '产品图片',
    'marketing.copy': '营销文案',
    'sales.video': '销售视频',
    'loading.project': '项目加载中...',
    'select.create.project': '选择项目或创建新项目',
    'project.will.display': '您选择的项目将在此处显示',
  },
  id: {
    // Common
    'choose.language': 'Pilih Bahasa',
    'add.image': 'Tambah Gambar',
    'upload': 'Unggah',
    'uploading': 'Mengunggah...',
    'uploaded': 'Diunggah',
    'drag.drop.image': 'Klik atau seret dan lepas gambar di sini',
    'upload.all.images': 'Unggah Semua Gambar',
    'select.image': 'Pilih Gambar',
    'no.images': 'Tidak ada gambar tersedia',
    'create.project': 'Buat Proyek',
    'delete': 'Hapus',
    
    // Error messages
    'load.failed': 'Gagal memuat gambar proyek',
    'upload.failed': 'Gagal mengunggah',
    'image.only': 'Hanya file gambar yang dapat diunggah',
    
    // Project related
    'new.project': 'Proyek Tampilan Produk Baru',
    'from.image.upload': 'Dibuat dari unggahan gambar',
    
    // Page elements
    'app.title': 'Generator Video Penjualan Produk',
    'app.subtitle': 'Ubah gambar produk Anda menjadi video penjualan yang menarik dengan AI',
    'product.image': 'Gambar Produk',
    'marketing.copy': 'Materi Pemasaran',
    'sales.video': 'Video Penjualan',
    'loading.project': 'Memuat proyek...',
    'select.create.project': 'Pilih atau buat proyek',
    'project.will.display': 'Proyek yang Anda pilih akan ditampilkan di sini',
  }
};

// Language Provider component
interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  // Try to get saved language from localStorage, or use browser language, or default to English
  const getInitialLanguage = (): Language => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language') as Language;
      if (savedLanguage && Object.keys(languageNames).includes(savedLanguage)) {
        return savedLanguage;
      }
      
      // Check browser language
      const browserLang = navigator.language.split('-')[0];
      if (browserLang === 'zh') return 'zh';
      if (browserLang === 'id') return 'id';
    }
    return 'en';
  };

  const [language, setLanguageState] = useState<Language>('en');

  // Initialize language on mount
  useEffect(() => {
    setLanguageState(getInitialLanguage());
  }, []);

  // Set language and save to localStorage
  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  // Translation function
  const t = (key: string): string => {
    if (!translations[language]) return key;
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook for using language context
export const useLanguage = () => useContext(LanguageContext); 