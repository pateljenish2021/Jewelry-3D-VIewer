import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const API_URL = API_BASE_URL ? `${API_BASE_URL}/api` : `http://${window.location.hostname}:5000/api`;

// Generate an internal name from a display name: lowercase, alphanum and hyphens
const slugify = (str = '') => {
  return String(str || '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

const styles = {
  // Layout
  wrapper: { 
    display: 'grid', 
    gridTemplateColumns: '280px 1fr', 
    minHeight: '100vh', 
    background: '#f3f4f6', 
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
  },
  
  // Sidebar
  aside: { 
    background: '#ffffff', 
    color: '#1a1a1a', 
    display: 'flex', 
    flexDirection: 'column', 
    position: 'sticky', 
    top: '0', 
    height: '100vh', 
    overflowY: 'auto',
    boxShadow: '2px 0 8px rgba(0,0,0,0.08)',
    borderRight: '1px solid #e5e7eb'
  },
  asideHeader: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '14px', 
    padding: '28px 24px', 
    borderBottom: '1px solid #e5e7eb',
    background: '#ffffff'
  },
  asideLogoIcon: { 
    fontSize: '28px',
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
  },
  asideTitle: { 
    fontSize: '22px', 
    fontWeight: '700', 
    margin: '0', 
    letterSpacing: '-0.3px',
    color: '#1a1a1a'
  },
  asideNav: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '8px', 
    padding: '24px 16px', 
    flex: 1 
  },
  asideNavItem: { 
    padding: '12px 16px', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    fontSize: '14px', 
    fontWeight: '500', 
    transition: 'all 0.2s ease', 
    border: 'none', 
    background: 'transparent', 
    color: '#6b7280', 
    textAlign: 'left', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px' 
  },
  asideNavItemDefault: {
    background: 'transparent',
    color: '#6b7280'
  },
  asideNavItemHover: { 
    background: '#f3f4f6', 
    color: '#111827' 
  },
  asideNavItemActive: { 
    background: '#dbeafe', 
    color: '#1e40af',
    borderLeft: 'none'
  },
  asideStats: { 
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0', 
    marginTop: 'auto', 
    borderTop: '1px solid #e5e7eb',
    background: '#ffffff'
  },
  asideStat: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '6px', 
    padding: '20px',
    borderRight: '1px solid #e5e7eb'
  },
  asideStatLabel: { 
    fontSize: '11px', 
    fontWeight: '600', 
    color: '#9ca3af', 
    textTransform: 'uppercase', 
    letterSpacing: '0.8px' 
  },
  asideStatValue: { 
    fontSize: '28px', 
    fontWeight: '700', 
    color: '#3b82f6',
    letterSpacing: '-1px'
  },
  
  // Main content
  main: { 
    display: 'flex', 
    flexDirection: 'column',
    minHeight: '100vh'
  },
  container: { 
    maxWidth: '100%', 
    padding: '48px 56px',
    background: '#f8f9fa', 
    minHeight: '100%' 
  },
  
  // Page header
  header: { 
    marginBottom: '32px', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    gap: '24px'
  },
  title: { 
    fontSize: '28px', 
    fontWeight: '700', 
    color: '#1a1a1a', 
    margin: '0',
    letterSpacing: '-0.5px'
  },
  tag: { 
    padding: '8px 16px', 
    background: '#eff6ff', 
    color: '#3b82f6', 
    borderRadius: '24px', 
    fontWeight: '600', 
    fontSize: '12px',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    border: '1px solid #dbeafe'
  },
  
  // Form
  formSection: { 
    marginBottom: '40px', 
    padding: '24px',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    background: '#ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
  },
  helperText: {
    marginTop: '8px',
    marginBottom: 0,
    fontSize: '12px',
    color: '#9ca3af'
  },
  formGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
    gap: '20px', 
    marginBottom: '24px' 
  },
  formGroup: { 
    display: 'flex', 
    flexDirection: 'column' 
  },
  label: { 
    fontSize: '12px', 
    fontWeight: '600', 
    color: '#6b7280', 
    marginBottom: '8px', 
    textTransform: 'uppercase', 
    letterSpacing: '0.5px' 
  },
  input: { 
    padding: '12px 14px', 
    border: '1px solid #d1d5db', 
    borderRadius: '8px', 
    fontSize: '14px', 
    fontFamily: 'inherit', 
    transition: 'all 0.2s ease',
    background: '#ffffff',
    color: '#1a1a1a',
    outline: 'none'
  },
  select: { 
    padding: '12px 14px', 
    border: '1px solid #d1d5db', 
    borderRadius: '8px', 
    fontSize: '14px', 
    fontFamily: 'inherit', 
    background: '#ffffff',
    color: '#1a1a1a',
    cursor: 'pointer'
  },
  sectionTitle: { 
    fontSize: '20px', 
    fontWeight: '700', 
    marginBottom: '20px', 
    color: '#1a1a1a', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '10px' 
  },
  sectionHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px'
  },
  sectionTools: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap'
  },
  searchInput: {
    minWidth: '220px',
    maxWidth: '320px',
    padding: '9px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '13px',
    background: '#fff',
    color: '#111827'
  },
  countBadge: {
    padding: '6px 10px',
    borderRadius: '999px',
    background: '#eef2ff',
    border: '1px solid #e0e7ff',
    color: '#4338ca',
    fontSize: '12px',
    fontWeight: '700'
  },
  
  // Buttons
  buttonGroup: { 
    display: 'flex', 
    gap: '12px', 
    gridColumn: '1 / -1',
    marginTop: '8px',
    position: 'sticky',
    bottom: 0,
    paddingTop: '14px',
    background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, #ffffff 36%)',
    zIndex: 2
  },
  button: { 
    padding: '12px 24px', 
    border: 'none', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    fontWeight: '600', 
    fontSize: '14px', 
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  buttonPrimary: { 
    background: '#3b82f6', 
    color: '#ffffff', 
    flex: 1,
    boxShadow: '0 2px 8px rgba(59,130,246,0.2)'
  },
  buttonSecondary: { 
    background: '#f3f4f6', 
    color: '#1a1a1a',
    border: '1px solid #d1d5db'
  },
  buttonDanger: { 
    background: '#ef4444', 
    color: 'white',
    boxShadow: '0 2px 8px rgba(239,68,68,0.2)'
  },
  
  // Cards
  cardList: { 
    display: 'grid', 
    gap: '16px', 
    marginTop: '16px' 
  },
  card: { 
    background: '#ffffff', 
    border: '1px solid #e5e7eb', 
    borderRadius: '12px', 
    padding: '20px', 
    display: 'grid', 
    gridTemplateColumns: 'auto 1fr auto', 
    gap: '20px', 
    alignItems: 'center',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    cursor: 'pointer'
  },
  cardImage: { 
    width: '100px', 
    height: '100px', 
    borderRadius: '8px', 
    objectFit: 'cover', 
    border: '1px solid #e5e7eb',
    background: '#f3f4f6'
  },
  cardContent: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '8px' 
  },
  cardTitle: { 
    fontSize: '16px', 
    fontWeight: '600', 
    color: '#1a1a1a', 
    margin: '0' 
  },
  cardTitleClamp: {
    display: '-webkit-box',
    WebkitLineClamp: 1,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    lineHeight: '1.3'
  },
  cardMeta: { 
    fontSize: '13px', 
    color: '#6b7280', 
    margin: '0',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    lineHeight: '1.45',
    wordBreak: 'break-word'
  },
  cardMetaCode: {
    padding: '2px 6px',
    borderRadius: '6px',
    background: '#f3f4f6',
    border: '1px solid #e5e7eb',
    color: '#374151',
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
    fontSize: '11px'
  },
  ellipsisText: {
    display: 'inline-block',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    verticalAlign: 'bottom'
  },
  inlineBadge: {
    padding: '4px 8px',
    borderRadius: '999px',
    background: '#dcfce7',
    border: '1px solid #bbf7d0',
    color: '#166534',
    fontSize: '11px',
    fontWeight: '700'
  },
  previewImage: {
    marginTop: '10px',
    width: '100%',
    maxWidth: '180px',
    height: '70px',
    objectFit: 'cover',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    background: '#f9fafb'
  },
  cardActions: { 
    display: 'flex', 
    gap: '10px',
    flexDirection: 'column'
  },
  compactCard: {
    padding: '16px'
  },
  denseHeadCard: {
    padding: '12px 14px',
    gridTemplateColumns: '1fr auto',
    gap: '12px',
    alignItems: 'start'
  },
  denseMetaLine: {
    fontSize: '13px',
    color: '#4b5563',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  smallActionButton: {
    padding: '8px 16px',
    fontSize: '13px',
    borderRadius: '10px'
  }
};

const navItems = [
  { key: 'heads', label: 'Head Combos', icon: '💎' },
  { key: 'shanks', label: 'Shanks', icon: '🪡' },
  { key: 'shankCategories', label: 'Shank Categories', icon: '🏷️' },
  { key: 'diamondShapes', label: 'Diamond Shapes', icon: '🔷' },
  { key: 'settingStyles', label: 'Setting Styles', icon: '🧵' },
  { key: 'caratWeights', label: 'Carat Weights', icon: '⚖️' },
  { key: 'pricing', label: 'Pricing', icon: '💲' }
];

function Admin() {
  const [activeTab, setActiveTab] = useState('heads');
  const [hoveredNav, setHoveredNav] = useState('');
  const [isCompactLayout, setIsCompactLayout] = useState(window.innerWidth < 1100);

  // Pricing UI collapse state (keep all closed by default)
  const [pricingCollapsed, setPricingCollapsed] = useState({ shank: true, carat: true, matching: true });

  const [heads, setHeads] = useState([]);
  const [shanks, setShanks] = useState([]);
  const [diamondShapes, setDiamondShapes] = useState([]);
  const [settingStyles, setSettingStyles] = useState([]);
  const [caratWeights, setCaratWeights] = useState([]);
  const [pricing, setPricing] = useState(null);

  const [shankCategories, setShankCategories] = useState([]);

  const [headForm, setHeadForm] = useState({ name: '', file: '', displayName: '', shanks: [], diamondShape: '', settingStyle: '', caratWeight: '', isDefault: false });
  const [shankForm, setShankForm] = useState({ name: '', file: '', matchingBandFile1: '', matchingBandFile2: '', displayName: '', image: '', category: 'Most Popular' });
  const [shankCategoryForm, setShankCategoryForm] = useState({ name: '', displayName: '', sortOrder: 0, active: true });
  const [shapeForm, setShapeForm] = useState({ name: '', displayName: '', image: '' });
  const [styleForm, setStyleForm] = useState({ name: '', displayName: '', image: '' });
  const [caratForm, setCaratForm] = useState({ name: '', displayName: '', value: 1 });

  const [editingHeadId, setEditingHeadId] = useState(null);
  const [editingShankId, setEditingShankId] = useState(null);
  const [editingShankCategoryId, setEditingShankCategoryId] = useState(null);
  const [editingShapeId, setEditingShapeId] = useState(null);
  const [editingStyleId, setEditingStyleId] = useState(null);
  const [editingCaratId, setEditingCaratId] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [search, setSearch] = useState({
    heads: '',
    shanks: '',
    shankCategories: '',
    diamondShapes: '',
    settingStyles: '',
    caratWeights: ''
  });

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const onResize = () => setIsCompactLayout(window.innerWidth < 1100);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const includesSearch = (value, key) => String(value || '').toLowerCase().includes(String(key || '').trim().toLowerCase());

  const filteredHeads = heads.filter((head) => {
    const key = search.heads;
    if (!key) return true;
    return includesSearch(head.displayName, key)
      || includesSearch(head.name, key)
      || includesSearch(head.file, key)
      || includesSearch(head.shanks?.map((s) => s.displayName || s).join(' '), key)
      || includesSearch(head.diamondShape?.displayName || head.diamondShape, key)
      || includesSearch(head.settingStyle?.displayName || head.settingStyle, key)
      || includesSearch(head.caratWeight?.displayName || head.caratWeight, key);
  });

  const filteredShanks = shanks.filter((shank) => {
    const key = search.shanks;
    if (!key) return true;
    return includesSearch(shank.displayName, key)
      || includesSearch(shank.name, key)
      || includesSearch(shank.file, key)
      || includesSearch(shank.category, key);
  });

  const filteredShankCategories = shankCategories.filter((cat) => {
    const key = search.shankCategories;
    if (!key) return true;
    return includesSearch(cat.displayName, key) || includesSearch(cat.name, key);
  });

  const filteredDiamondShapes = diamondShapes.filter((shape) => {
    const key = search.diamondShapes;
    if (!key) return true;
    return includesSearch(shape.displayName, key) || includesSearch(shape.name, key);
  });

  const filteredSettingStyles = settingStyles.filter((style) => {
    const key = search.settingStyles;
    if (!key) return true;
    return includesSearch(style.displayName, key) || includesSearch(style.name, key);
  });

  const filteredCaratWeights = caratWeights.filter((carat) => {
    const key = search.caratWeights;
    if (!key) return true;
    return includesSearch(carat.displayName, key) || includesSearch(carat.name, key) || includesSearch(carat.value, key);
  });

  const loadAll = async () => {
    await Promise.all([fetchShapes(), fetchStyles(), fetchCarats(), fetchHeads(), fetchShanks(), fetchShankCategories(), fetchPricing()]);
  };

  const fetchPricing = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/pricing`);
      setPricing(res.data);
    } catch (error) {
      console.error('Error fetching pricing:', error);
    }
  };

  const savePricing = async (updates) => {
    try {
      const body = { ...pricing, ...updates };
      const res = await axios.put(`${API_URL}/admin/pricing`, body);
      setPricing(res.data);
      toast.success('Pricing updated');
      fetchPricing();
    } catch (error) {
      console.error('Error saving pricing:', error);
      toast.error('Error saving pricing: ' + (error.response?.data?.error || error.message));
    }
  };

  // Upload file to R2
  const handleFileUpload = async (e, fieldName, formType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post(`${API_URL}/admin/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      
      // Update the appropriate form based on fieldName and formType
      if (formType === 'head') setHeadForm({ ...headForm, [fieldName]: res.data.url });
      else if (formType === 'shank') setShankForm({ ...shankForm, [fieldName]: res.data.url });
      else if (formType === 'shape') setShapeForm({ ...shapeForm, [fieldName]: res.data.url });
      else if (formType === 'style') {
        // support nested 'images:shapeName' fieldName to set per-shape images
        if (fieldName && fieldName.startsWith('images:')) {
          const parts = fieldName.split(':');
          const shapeKey = parts[1];
          setStyleForm(prev => ({ ...prev, images: { ...(prev.images || {}), [shapeKey]: res.data.url } }));
        } else {
          setStyleForm({ ...styleForm, [fieldName]: res.data.url });
        }
      }
      else if (formType === 'carat') setCaratForm({ ...caratForm, [fieldName]: res.data.url });

      toast.success('File uploaded successfully!');
    } catch (error) {
      console.error('Upload error details:', error);
      console.error('Error response:', error.response?.data);
      toast.error('Upload failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploadingFile(false);
    }
  };

  const fetchHeads = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/heads`);
      setHeads(res.data);
    } catch (error) {
      console.error('Error fetching heads:', error);
    }
  };

  const fetchShanks = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/shanks`);
      setShanks(res.data);
    } catch (error) {
      console.error('Error fetching shanks:', error);
    }
  };

  const fetchShankCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/shank-categories`);
      setShankCategories(res.data);
    } catch (error) {
      console.error('Error fetching shank categories:', error);
    }
  };

  const fetchShapes = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/diamond-shapes`);
      setDiamondShapes(res.data);
    } catch (error) {
      console.error('Error fetching diamond shapes:', error);
    }
  };

  const fetchStyles = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/setting-styles`);
      setSettingStyles(res.data);
    } catch (error) {
      console.error('Error fetching setting styles:', error);
    }
  };

  const fetchCarats = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/carat-weights`);
      setCaratWeights(res.data);
    } catch (error) {
      console.error('Error fetching carat weights:', error);
    }
  };

  // Head CRUD with combination dropdowns
  const addHead = async (e) => {
    e.preventDefault();
    try {
      // Require at least one shank (multi-select)
      if (headForm.shanks.length === 0 || !headForm.diamondShape || !headForm.settingStyle || !headForm.caratWeight) {
        toast.warning('Select at least one shank, diamond shape, setting style, and carat weight.');
        return;
      }

      // ensure internal name exists (auto-generate from displayName when adding)
      const payload = { ...headForm };
      if (!payload.name) payload.name = slugify(payload.displayName || '');

      if (editingHeadId) {
        await axios.put(`${API_URL}/admin/heads/${editingHeadId}`, headForm);
        setEditingHeadId(null);
        toast.success('Head variant updated!');
      } else {
        await axios.post(`${API_URL}/admin/heads`, payload);
        toast.success('Head variant added!');
      }

      setHeadForm({ name: '', file: '', displayName: '', shanks: [], diamondShape: '', settingStyle: '', caratWeight: '', isDefault: false });
      fetchHeads();
    } catch (error) {
      toast.error('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const editHead = (head) => {
    setHeadForm({
      ...head,
      shanks: head.shanks?.map(s => s._id || s) || [],
      diamondShape: head.diamondShape?._id || head.diamondShape || '',
      settingStyle: head.settingStyle?._id || head.settingStyle || '',
      caratWeight: head.caratWeight?._id || head.caratWeight || '',
      isDefault: !!head.isDefault
    });
    setEditingHeadId(head._id);
    window.scrollTo(0, 0);
  };

  const deleteHead = async (id) => {
    if (confirm('Delete this head variant?')) {
      try {
        await axios.delete(`${API_URL}/admin/heads/${id}`);
        fetchHeads();
        toast.success('Head variant deleted!');
      } catch (error) {
        toast.error('Error: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  // Shank CRUD
  const addShank = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...shankForm };
      if (!payload.name) payload.name = slugify(payload.displayName || '');

      if (editingShankId) {
        await axios.put(`${API_URL}/admin/shanks/${editingShankId}`, shankForm);
        setEditingShankId(null);
        toast.success('Shank variant updated!');
      } else {
        await axios.post(`${API_URL}/admin/shanks`, payload);
        toast.success('Shank variant added!');
      }
      setShankForm({ name: '', file: '', matchingBandFile1: '', matchingBandFile2: '', displayName: '', image: '', category: shankCategories[0]?.displayName || 'Most Popular' });
      fetchShanks();
    } catch (error) {
      toast.error('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const editShank = (shank) => {
    setShankForm(shank);
    setEditingShankId(shank._id);
    window.scrollTo(0, 0);
  };

  const deleteShank = async (id) => {
    if (confirm('Delete this shank variant?')) {
      try {
        await axios.delete(`${API_URL}/admin/shanks/${id}`);
        fetchShanks();
        toast.success('Shank variant deleted!');
      } catch (error) {
        toast.error('Error: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  // Shank category CRUD
  const addShankCategory = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...shankCategoryForm };
      if (!payload.name) payload.name = slugify(payload.displayName || '');

      if (editingShankCategoryId) {
        await axios.put(`${API_URL}/admin/shank-categories/${editingShankCategoryId}`, payload);
        setEditingShankCategoryId(null);
        toast.success('Shank category updated!');
      } else {
        await axios.post(`${API_URL}/admin/shank-categories`, payload);
        toast.success('Shank category added!');
      }
      setShankCategoryForm({ name: '', displayName: '', sortOrder: 0, active: true });
      fetchShankCategories();
    } catch (error) {
      toast.error('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const editShankCategory = (cat) => {
    setShankCategoryForm({ name: cat.name, displayName: cat.displayName, sortOrder: cat.sortOrder ?? 0, active: cat.active !== false });
    setEditingShankCategoryId(cat._id);
    window.scrollTo(0, 0);
  };

  const deleteShankCategory = async (id) => {
    if (confirm('Delete this shank category?')) {
      try {
        await axios.delete(`${API_URL}/admin/shank-categories/${id}`);
        fetchShankCategories();
        toast.success('Shank category deleted!');
      } catch (error) {
        toast.error('Error: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  // Shape CRUD
  const addShape = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...shapeForm };
      if (!payload.name) payload.name = slugify(payload.displayName || '');

      if (editingShapeId) {
        await axios.put(`${API_URL}/admin/diamond-shapes/${editingShapeId}`, shapeForm);
        setEditingShapeId(null);
        toast.success('Diamond shape updated!');
      } else {
        await axios.post(`${API_URL}/admin/diamond-shapes`, payload);
        toast.success('Diamond shape added!');
      }
      setShapeForm({ name: '', displayName: '', image: '' });
      fetchShapes();
    } catch (error) {
      toast.error('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const editShape = (shape) => {
    setShapeForm(shape);
    setEditingShapeId(shape._id);
  };

  const deleteShape = async (id) => {
    if (confirm('Delete this diamond shape?')) {
      try {
        await axios.delete(`${API_URL}/admin/diamond-shapes/${id}`);
        fetchShapes();
        toast.success('Diamond shape deleted!');
      } catch (error) {
        toast.error('Error: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  // Style CRUD
  const addStyle = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...styleForm };
      if (!payload.name) payload.name = slugify(payload.displayName || '');

      if (editingStyleId) {
        await axios.put(`${API_URL}/admin/setting-styles/${editingStyleId}`, styleForm);
        setEditingStyleId(null);
        toast.success('Setting style updated!');
      } else {
        await axios.post(`${API_URL}/admin/setting-styles`, payload);
        toast.success('Setting style added!');
      }
      setStyleForm({ name: '', displayName: '', image: '', images: {} });
      fetchStyles();
    } catch (error) {
      toast.error('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const editStyle = (style) => {
    setStyleForm({ ...style, images: style.images || {} });
    setEditingStyleId(style._id);
  };

  const deleteStyle = async (id) => {
    if (confirm('Delete this setting style?')) {
      try {
        await axios.delete(`${API_URL}/admin/setting-styles/${id}`);
        fetchStyles();
        toast.success('Setting style deleted!');
      } catch (error) {
        toast.error('Error: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  // Carat CRUD
  const addCarat = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...caratForm };
      if (!payload.name) payload.name = slugify(payload.displayName || '');

      if (editingCaratId) {
        await axios.put(`${API_URL}/admin/carat-weights/${editingCaratId}`, caratForm);
        setEditingCaratId(null);
        toast.success('Carat weight updated!');
      } else {
        await axios.post(`${API_URL}/admin/carat-weights`, payload);
        toast.success('Carat weight added!');
      }
      setCaratForm({ name: '', displayName: '', value: 1, image: '' });
      fetchCarats();
    } catch (error) {
      toast.error('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const editCarat = (carat) => {
    setCaratForm(carat);
    setEditingCaratId(carat._id);
  };

  const deleteCarat = async (id) => {
    if (confirm('Delete this carat weight?')) {
      try {
        await axios.delete(`${API_URL}/admin/carat-weights/${id}`);
        fetchCarats();
        toast.success('Carat weight deleted!');
      } catch (error) {
        toast.error('Error: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const renderHeadTab = () => (
    <div>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{editingHeadId ? 'Edit Head Combination' : 'Add Head Combination'}</h2>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Manage and customize head combinations</p>
        </div>
        <span style={styles.tag}>💎 Head</span>
      </div>
      <form onSubmit={addHead} style={styles.formSection}>
        <h3 style={{ ...styles.sectionTitle, marginBottom: '24px', marginTop: 0 }}>Create New</h3>
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Shank Variants (select one or more)</label>
            <div style={{ 
              border: '1px solid #d1d5db', 
              borderRadius: '8px', 
              padding: '12px', 
              maxHeight: '220px', 
              overflowY: 'auto',
              background: '#fff'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  checked={shanks.length > 0 && headForm.shanks.length === shanks.length}
                  onChange={(e) => {
                    if (e.target.checked) setHeadForm({ ...headForm, shanks: shanks.map(s => s._id) });
                    else setHeadForm({ ...headForm, shanks: [] });
                  }}
                  style={{ width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '13px', color: '#374151', fontWeight: 600 }}>Select all shanks</span>
              </label>
              {shanks.map((shank) => (
                <label 
                  key={shank._id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '6px 4px',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={headForm.shanks.includes(shank._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setHeadForm({ ...headForm, shanks: [...headForm.shanks, shank._id] });
                      } else {
                        setHeadForm({ ...headForm, shanks: headForm.shanks.filter(id => id !== shank._id) });
                      }
                    }}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '13px', color: '#374151' }}>{shank.displayName}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Diamond Shape</label>
            <select
              style={styles.select}
              value={headForm.diamondShape}
              onChange={(e) => setHeadForm({ ...headForm, diamondShape: e.target.value })}
              required
            >
              <option value="">Select shape</option>
              {diamondShapes.map((shape) => (
                <option key={shape._id} value={shape._id}>{shape.displayName}</option>
              ))}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Setting Style</label>
            <select
              style={styles.select}
              value={headForm.settingStyle}
              onChange={(e) => setHeadForm({ ...headForm, settingStyle: e.target.value })}
              required
            >
              <option value="">Select style</option>
              {settingStyles.map((style) => (
                <option key={style._id} value={style._id}>{style.displayName}</option>
              ))}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Carat Weight</label>
            <select
              style={styles.select}
              value={headForm.caratWeight}
              onChange={(e) => setHeadForm({ ...headForm, caratWeight: e.target.value })}
              required
            >
              <option value="">Select carat</option>
              {caratWeights.map((carat) => (
                <option key={carat._id} value={carat._id}>{carat.displayName}</option>
              ))}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Display Name (optional)</label>
            <input
              style={styles.input}
              type="text"
              placeholder="auto-generated if empty"
              value={headForm.displayName}
              onChange={(e) => {
                const v = e.target.value;
                setHeadForm((prev) => ({ ...prev, displayName: v, name: editingHeadId ? prev.name : slugify(v) }));
              }}
            />
          </div>
          <div style={{ ...styles.formGroup, flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="head-default"
              checked={!!headForm.isDefault}
              onChange={(e) => setHeadForm({ ...headForm, isDefault: e.target.checked })}
              style={{ width: '16px', height: '16px' }}
            />
            <label htmlFor="head-default" style={{ ...styles.label, marginBottom: 0, textTransform: 'none' }}>
              Set as default combination
            </label>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Model File (GLB)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                style={styles.input}
                type="text"
                placeholder="./head.glb or upload file"
                value={headForm.file}
                onChange={(e) => setHeadForm({ ...headForm, file: e.target.value })}
                required
              />
              <label style={{ ...styles.button, ...styles.buttonSecondary, flex: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                📤 Upload GLB
                <input type="file" accept=".glb,model/gltf-binary" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'file', 'head')} disabled={uploadingFile} />
              </label>
            </div>
            <p style={styles.helperText}>Tip: Paste a hosted GLB URL or upload directly.</p>
          </div>
          <div style={styles.buttonGroup}>
            <button type="submit" style={{ ...styles.button, ...styles.buttonPrimary }}>
              {editingHeadId ? '💾 Update Head' : '➕ Add Head'}
            </button>
            {editingHeadId && (
              <button
                type="button"
                style={{ ...styles.button, ...styles.buttonSecondary }}
                onClick={() => {
                  setEditingHeadId(null);
                  setHeadForm({ name: '', file: '', displayName: '', shanks: [], diamondShape: '', settingStyle: '', caratWeight: '', isDefault: false });
                }}
              >
                ✕ Cancel
              </button>
            )}
          </div>
        </div>
        </form>

      <div style={styles.formSection}>
        <div style={styles.sectionHeaderRow}>
          <h3 style={{ ...styles.sectionTitle, marginBottom: 0 }}>Head Combinations</h3>
          <div style={styles.sectionTools}>
            <input
              style={styles.searchInput}
              type="text"
              placeholder="Search heads..."
              value={search.heads}
              onChange={(e) => setSearch((prev) => ({ ...prev, heads: e.target.value }))}
            />
            <span style={styles.countBadge}>{filteredHeads.length}/{heads.length}</span>
          </div>
        </div>
        {heads.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No head variants yet. Add one to get started.</p>
        ) : filteredHeads.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No head variants match your search.</p>
        ) : (
          <div style={styles.cardList}>
            {filteredHeads.map((head) => {
              const shankNames = head.shanks?.length > 0
                ? head.shanks.map(s => s.displayName || s)
                : [head.shank?.displayName || head.shank || '—'];
              const shankPreview = shankNames.length > 3
                ? `${shankNames.slice(0, 2).join(', ')} +${shankNames.length - 2} more`
                : shankNames.join(', ');

              return (
                <div key={head._id} style={{ ...styles.card, ...styles.denseHeadCard }}>
                  <div style={{ ...styles.cardContent, gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                      <h4 title={head.displayName || head.name} style={{ ...styles.cardTitle, ...styles.cardTitleClamp, fontSize: '17px', marginRight: '6px' }}>{head.displayName || head.name}</h4>
                      {head.isDefault && <span style={styles.inlineBadge}>Default</span>}
                    </div>
                    <p style={styles.denseMetaLine}>ID: {head.name}</p>
                    <p title={shankNames.join(', ')} style={styles.denseMetaLine}>Shanks: {shankPreview}</p>
                    <p style={styles.denseMetaLine}>Shape: {head.diamondShape?.displayName || head.diamondShape} • Style: {head.settingStyle?.displayName || head.settingStyle} • Carat: {head.caratWeight?.displayName || head.caratWeight}</p>
                    <p style={{ ...styles.denseMetaLine, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ flex: '0 0 auto' }}>GLB:</span>
                      <span title={head.file} style={{ ...styles.cardMetaCode, ...styles.ellipsisText, maxWidth: '460px' }}>{head.file}</span>
                    </p>
                  </div>
                  <div style={{ ...styles.cardActions, flexDirection: 'row', gap: '8px' }}>
                    <button style={{ ...styles.button, ...styles.buttonSecondary, ...styles.smallActionButton }} onClick={() => editHead(head)}>Edit</button>
                    <button style={{ ...styles.button, ...styles.buttonDanger, ...styles.smallActionButton }} onClick={() => deleteHead(head._id)}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderShankCategoryTab = () => (
    <div>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{editingShankCategoryId ? 'Edit Shank Category' : 'Add Shank Category'}</h2>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Manage shank category options</p>
        </div>
        <span style={styles.tag}>🏷️ Category</span>
      </div>

      <form onSubmit={addShankCategory} style={styles.formSection}>
        <h3 style={{ ...styles.sectionTitle, marginBottom: '24px', marginTop: 0 }}>Create New</h3>
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Display Name</label>
            <input
              style={styles.input}
              type="text"
              value={shankCategoryForm.displayName}
              onChange={(e) => {
                const v = e.target.value;
                setShankCategoryForm(prev => ({ ...prev, displayName: v, name: editingShankCategoryId ? prev.name : slugify(v) }));
              }}
              required
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Slug (name)</label>
            <input
              style={styles.input}
              type="text"
              value={shankCategoryForm.name}
              onChange={(e) => setShankCategoryForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="most-popular"
              required
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Sort Order</label>
            <input
              style={styles.input}
              type="number"
              value={shankCategoryForm.sortOrder}
              onChange={(e) => setShankCategoryForm(prev => ({ ...prev, sortOrder: Number(e.target.value) }))}
            />
          </div>
          <div style={{ ...styles.formGroup, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={shankCategoryForm.active}
              onChange={(e) => setShankCategoryForm(prev => ({ ...prev, active: e.target.checked }))}
              style={{ width: '16px', height: '16px' }}
            />
            <label style={{ ...styles.label, margin: 0 }}>Active</label>
          </div>
          <div style={styles.buttonGroup}>
            <button type="submit" style={{ ...styles.button, ...styles.buttonPrimary }}>
              {editingShankCategoryId ? '💾 Update Category' : '➕ Add Category'}
            </button>
            {editingShankCategoryId && (
              <button
                type="button"
                style={{ ...styles.button, ...styles.buttonSecondary }}
                onClick={() => {
                  setEditingShankCategoryId(null);
                  setShankCategoryForm({ name: '', displayName: '', sortOrder: 0, active: true });
                }}
              >
                ✕ Cancel
              </button>
            )}
          </div>
        </div>
      </form>

      <div style={styles.formSection}>
        <div style={styles.sectionHeaderRow}>
          <h3 style={{ ...styles.sectionTitle, marginBottom: 0 }}>Categories</h3>
          <div style={styles.sectionTools}>
            <input
              style={styles.searchInput}
              type="text"
              placeholder="Search categories..."
              value={search.shankCategories}
              onChange={(e) => setSearch((prev) => ({ ...prev, shankCategories: e.target.value }))}
            />
            <span style={styles.countBadge}>{filteredShankCategories.length}/{shankCategories.length}</span>
          </div>
        </div>
        {shankCategories.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No shank categories yet.</p>
        ) : filteredShankCategories.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No categories match your search.</p>
        ) : (
          <div style={styles.cardList}>
            {filteredShankCategories.map((cat) => (
              <div key={cat._id} style={styles.card}>
                <div style={styles.cardContent}>
                  <h4 style={styles.cardTitle}>{cat.displayName}</h4>
                  <p style={styles.cardMeta}>Slug: {cat.name}</p>
                  <p style={styles.cardMeta}>Sort: {cat.sortOrder ?? 0}</p>
                  <p style={styles.cardMeta}>Active: {cat.active !== false ? 'Yes' : 'No'}</p>
                </div>
                <div style={styles.cardActions}>
                  <button style={{ ...styles.button, ...styles.buttonSecondary }} onClick={() => editShankCategory(cat)}>Edit</button>
                  <button style={{ ...styles.button, ...styles.buttonDanger }} onClick={() => deleteShankCategory(cat._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderShankTab = () => (
    <div>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{editingShankId ? 'Edit Shank Variant' : 'Add Shank Variant'}</h2>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Customize shank designs</p>
        </div>
        <span style={styles.tag}>🪡 Shank</span>
      </div>
      <form onSubmit={addShank} style={styles.formSection}>
        <h3 style={{ ...styles.sectionTitle, marginBottom: '24px', marginTop: 0 }}>Create New</h3>
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Display Name</label>
            <input style={styles.input} type="text" value={shankForm.displayName} onChange={(e) => { const v = e.target.value; setShankForm(prev => ({ ...prev, displayName: v, name: editingShankId ? prev.name : slugify(v) })); }} required />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Model File (GLB)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input style={styles.input} type="text" value={shankForm.file} onChange={(e) => setShankForm({ ...shankForm, file: e.target.value })} required />
              <label style={{ ...styles.button, ...styles.buttonSecondary, flex: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                📤 Upload GLB
                <input type="file" accept=".glb,model/gltf-binary" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'file', 'shank')} disabled={uploadingFile} />
              </label>
            </div>
            <p style={styles.helperText}>Main shank model used in the viewer.</p>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Band 1 GLB (optional)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input style={styles.input} type="text" placeholder="Upload matching band model" value={shankForm.matchingBandFile1} onChange={(e) => setShankForm({ ...shankForm, matchingBandFile1: e.target.value })} />
              <label style={{ ...styles.button, ...styles.buttonSecondary, flex: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                📤 Upload GLB
                <input type="file" accept=".glb,model/gltf-binary" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'matchingBandFile1', 'shank')} disabled={uploadingFile} />
              </label>
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Band 2 GLB (optional)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input style={styles.input} type="text" placeholder="Upload matching band model" value={shankForm.matchingBandFile2} onChange={(e) => setShankForm({ ...shankForm, matchingBandFile2: e.target.value })} />
              <label style={{ ...styles.button, ...styles.buttonSecondary, flex: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                📤 Upload GLB
                <input type="file" accept=".glb,model/gltf-binary" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'matchingBandFile2', 'shank')} disabled={uploadingFile} />
              </label>
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Category</label>
            <select
              style={styles.select}
              value={shankForm.category || ''}
              onChange={(e) => setShankForm({ ...shankForm, category: e.target.value })}
            >
              <option value="">Select category</option>
              {shankCategories.map((cat) => (
                <option key={cat._id} value={cat.displayName}>{cat.displayName}</option>
              ))}
              {shankCategories.length === 0 && <option value="Most Popular">Most Popular</option>}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Image URL</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input style={styles.input} type="text" value={shankForm.image} onChange={(e) => setShankForm({ ...shankForm, image: e.target.value })} />
              <label style={{ ...styles.button, ...styles.buttonSecondary, flex: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                📤 Upload
                <input type="file" accept="image/*,.svg" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'image', 'shank')} disabled={uploadingFile} />
              </label>
            </div>
            {!!shankForm.image && <img src={shankForm.image} alt="Shank preview" style={styles.previewImage} />}
          </div>
          <div style={styles.buttonGroup}>
            <button type="submit" style={{ ...styles.button, ...styles.buttonPrimary }}>
              {editingShankId ? '💾 Update Shank' : '➕ Add Shank'}
            </button>
            {editingShankId && (
              <button
                type="button"
                style={{ ...styles.button, ...styles.buttonSecondary }}
                onClick={() => {
                  setEditingShankId(null);
                  setShankForm({ name: '', file: '', matchingBandFile1: '', matchingBandFile2: '', displayName: '', image: '', category: shankCategories[0]?.displayName || 'Most Popular' });
                }}
              >
                ✕ Cancel
              </button>
            )}
          </div>
        </div>
      </form>

      <div style={styles.formSection}>
        <div style={styles.sectionHeaderRow}>
          <h3 style={{ ...styles.sectionTitle, marginBottom: 0 }}>Shank Variants</h3>
          <div style={styles.sectionTools}>
            <input
              style={styles.searchInput}
              type="text"
              placeholder="Search shanks..."
              value={search.shanks}
              onChange={(e) => setSearch((prev) => ({ ...prev, shanks: e.target.value }))}
            />
            <span style={styles.countBadge}>{filteredShanks.length}/{shanks.length}</span>
          </div>
        </div>
        {shanks.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No shank variants yet.</p>
        ) : filteredShanks.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No shank variants match your search.</p>
        ) : (
          <div style={styles.cardList}>
            {filteredShanks.map((shank) => (
              <div key={shank._id} style={styles.card}>
                {shank.image ? (
                  <img src={shank.image} alt={shank.displayName} style={styles.cardImage} />
                ) : (
                  <div style={{ ...styles.cardImage, background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>No Image</div>
                )}
                <div style={styles.cardContent}>
                  <h4 style={styles.cardTitle}>{shank.displayName}</h4>
                  <p style={styles.cardMeta}>ID: {shank.name}</p>
                  <p style={styles.cardMeta}>GLB: <span style={styles.cardMetaCode}>{shank.file}</span></p>
                  <p style={styles.cardMeta}>Category: {shank.category || 'Most Popular'}</p>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      background: shank.matchingBandFile1 ? '#d1fae5' : '#fee2e2', 
                      color: shank.matchingBandFile1 ? '#065f46' : '#991b1b',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      Band 1: {shank.matchingBandFile1 ? '✓' : '✕'}
                    </span>
                    <span style={{ 
                      padding: '4px 8px', 
                      background: shank.matchingBandFile2 ? '#d1fae5' : '#fee2e2', 
                      color: shank.matchingBandFile2 ? '#065f46' : '#991b1b',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      Band 2: {shank.matchingBandFile2 ? '✓' : '✕'}
                    </span>
                  </div>
                </div>
                <div style={styles.cardActions}>
                  <button style={{ ...styles.button, ...styles.buttonSecondary }} onClick={() => editShank(shank)}>Edit</button>
                  <button style={{ ...styles.button, ...styles.buttonDanger }} onClick={() => deleteShank(shank._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderShapeTab = () => (
    <div>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{editingShapeId ? 'Edit Diamond Shape' : 'Add Diamond Shape'}</h2>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Manage diamond shape options</p>
        </div>
        <span style={styles.tag}>🔷 Diamond</span>
      </div>
      <form onSubmit={addShape} style={styles.formSection}>
        <h3 style={{ ...styles.sectionTitle, marginBottom: '24px', marginTop: 0 }}>Create New</h3>
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Display Name</label>
            <input style={styles.input} type="text" value={shapeForm.displayName} onChange={(e) => { const v = e.target.value; setShapeForm(prev => ({ ...prev, displayName: v, name: editingShapeId ? prev.name : slugify(v) })); }} required />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Image URL</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input style={styles.input} type="text" value={shapeForm.image} onChange={(e) => setShapeForm({ ...shapeForm, image: e.target.value })} />
              <label style={{ ...styles.button, ...styles.buttonSecondary, flex: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                📤 Upload
                <input type="file" accept="image/*,.svg" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'image', 'shape')} disabled={uploadingFile} />
              </label>
            </div>
            {!!shapeForm.image && <img src={shapeForm.image} alt="Shape preview" style={styles.previewImage} />}
          </div>
          <div style={styles.buttonGroup}>
            <button type="submit" style={{ ...styles.button, ...styles.buttonPrimary }}>
              {editingShapeId ? '💾 Update Shape' : '➕ Add Shape'}
            </button>
            {editingShapeId && (
              <button type="button" style={{ ...styles.button, ...styles.buttonSecondary }} onClick={() => { setEditingShapeId(null); setShapeForm({ name: '', displayName: '', image: '' }); }}>✕ Cancel</button>
            )}
          </div>
        </div>
      </form>
      <div style={styles.formSection}>
        <div style={styles.sectionHeaderRow}>
          <h3 style={{ ...styles.sectionTitle, marginBottom: 0 }}>Diamond Shapes</h3>
          <div style={styles.sectionTools}>
            <input
              style={styles.searchInput}
              type="text"
              placeholder="Search shapes..."
              value={search.diamondShapes}
              onChange={(e) => setSearch((prev) => ({ ...prev, diamondShapes: e.target.value }))}
            />
            <span style={styles.countBadge}>{filteredDiamondShapes.length}/{diamondShapes.length}</span>
          </div>
        </div>
        {diamondShapes.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No diamond shapes yet.</p>
        ) : filteredDiamondShapes.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No diamond shapes match your search.</p>
        ) : (
          <div style={styles.cardList}>
            {filteredDiamondShapes.map((shape) => (
              <div key={shape._id} style={styles.card}>
                <div style={{ ...styles.cardImage, background: shape.image ? 'transparent' : '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                  {shape.image ? <img src={shape.image} alt={shape.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} /> : 'No Image'}
                </div>
                <div style={styles.cardContent}>
                  <h4 style={styles.cardTitle}>{shape.displayName}</h4>
                  <p style={styles.cardMeta}>ID: {shape.name}</p>
                </div>
                <div style={styles.cardActions}>
                  <button style={{ ...styles.button, ...styles.buttonSecondary }} onClick={() => editShape(shape)}>Edit</button>
                  <button style={{ ...styles.button, ...styles.buttonDanger }} onClick={() => deleteShape(shape._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderStyleTab = () => (
    <div>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{editingStyleId ? 'Edit Setting Style' : 'Add Setting Style'}</h2>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Manage setting style variations</p>
        </div>
        <span style={styles.tag}>🧵 Style</span>
      </div>
      <form onSubmit={addStyle} style={styles.formSection}>
        <h3 style={{ ...styles.sectionTitle, marginBottom: '24px', marginTop: 0 }}>Create New</h3>
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Display Name</label>
            <input style={styles.input} type="text" value={styleForm.displayName} onChange={(e) => { const v = e.target.value; setStyleForm(prev => ({ ...prev, displayName: v, name: editingStyleId ? prev.name : slugify(v) })); }} required />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Image URL</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input style={styles.input} type="text" value={styleForm.image} onChange={(e) => setStyleForm({ ...styleForm, image: e.target.value })} />
              <label style={{ ...styles.button, ...styles.buttonSecondary, flex: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                📤 Upload
                <input type="file" accept="image/*,.svg" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'image', 'style')} disabled={uploadingFile} />
              </label>
            </div>
            {!!styleForm.image && <img src={styleForm.image} alt="Style preview" style={styles.previewImage} />}
          </div>
          <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
            <label style={styles.label}>Per-shape Images (optional)</label>
            <div style={{ display: 'grid', gap: '10px' }}>
              {diamondShapes.map((shape) => (
                <div key={shape._id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ width: 160 }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: 6 }}>{shape.displayName}</div>
                    <input style={styles.input} type="text" value={(styleForm.images || {})[shape.name] || ''} onChange={(e) => setStyleForm(prev => ({ ...prev, images: { ...(prev.images || {}), [shape.name]: e.target.value } }))} placeholder={`Image URL for ${shape.displayName}`} />
                  </div>
                  <label style={{ ...styles.button, ...styles.buttonSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📤 Upload
                    <input type="file" accept="image/*,.svg" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, `images:${shape.name}`, 'style')} disabled={uploadingFile} />
                  </label>
                  {((styleForm.images || {})[shape.name]) && (
                    <img src={(styleForm.images || {})[shape.name]} alt={shape.displayName} style={{ width: 64, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div style={styles.buttonGroup}>
            <button type="submit" style={{ ...styles.button, ...styles.buttonPrimary }}>
              {editingStyleId ? '💾 Update Style' : '➕ Add Style'}
            </button>
            {editingStyleId && (
              <button type="button" style={{ ...styles.button, ...styles.buttonSecondary }} onClick={() => { setEditingStyleId(null); setStyleForm({ name: '', displayName: '', image: '' }); }}>✕ Cancel</button>
            )}
          </div>
        </div>
      </form>
      <div style={styles.formSection}>
        <div style={styles.sectionHeaderRow}>
          <h3 style={{ ...styles.sectionTitle, marginBottom: 0 }}>Setting Styles</h3>
          <div style={styles.sectionTools}>
            <input
              style={styles.searchInput}
              type="text"
              placeholder="Search styles..."
              value={search.settingStyles}
              onChange={(e) => setSearch((prev) => ({ ...prev, settingStyles: e.target.value }))}
            />
            <span style={styles.countBadge}>{filteredSettingStyles.length}/{settingStyles.length}</span>
          </div>
        </div>
        {settingStyles.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No setting styles yet.</p>
        ) : filteredSettingStyles.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No setting styles match your search.</p>
        ) : (
          <div style={styles.cardList}>
            {filteredSettingStyles.map((style) => (
              <div key={style._id} style={styles.card}>
                <div style={{ ...styles.cardImage, background: style.image ? 'transparent' : '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                  {style.image ? <img src={style.image} alt={style.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} /> : 'No Image'}
                </div>
                <div style={styles.cardContent}>
                  <h4 style={styles.cardTitle}>{style.displayName}</h4>
                  <p style={styles.cardMeta}>ID: {style.name}</p>
                </div>
                <div style={styles.cardActions}>
                  <button style={{ ...styles.button, ...styles.buttonSecondary }} onClick={() => editStyle(style)}>Edit</button>
                  <button style={{ ...styles.button, ...styles.buttonDanger }} onClick={() => deleteStyle(style._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderCaratTab = () => (
    <div>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{editingCaratId ? 'Edit Carat Weight' : 'Add Carat Weight'}</h2>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Manage carat weight options</p>
        </div>
        <span style={styles.tag}>⚖️ Carat</span>
      </div>
      <form onSubmit={addCarat} style={styles.formSection}>
        <h3 style={{ ...styles.sectionTitle, marginBottom: '24px', marginTop: 0 }}>Create New</h3>
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Display Name</label>
            <input style={styles.input} type="text" value={caratForm.displayName} onChange={(e) => { const v = e.target.value; setCaratForm(prev => ({ ...prev, displayName: v, name: editingCaratId ? prev.name : slugify(v) })); }} required />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Carat Value</label>
            <input style={styles.input} type="number" step="0.01" value={caratForm.value} onChange={(e) => setCaratForm({ ...caratForm, value: parseFloat(e.target.value) })} required />
          </div>
          <div style={styles.buttonGroup}>
            <button type="submit" style={{ ...styles.button, ...styles.buttonPrimary }}>
              {editingCaratId ? '💾 Update Carat' : '➕ Add Carat'}
            </button>
            {editingCaratId && (
              <button type="button" style={{ ...styles.button, ...styles.buttonSecondary }} onClick={() => { setEditingCaratId(null); setCaratForm({ name: '', displayName: '', value: 1 }); }}>✕ Cancel</button>
            )}
          </div>
        </div>
      </form>
      <div style={styles.formSection}>
        <div style={styles.sectionHeaderRow}>
          <h3 style={{ ...styles.sectionTitle, marginBottom: 0 }}>Carat Weights</h3>
          <div style={styles.sectionTools}>
            <input
              style={styles.searchInput}
              type="text"
              placeholder="Search carat weights..."
              value={search.caratWeights}
              onChange={(e) => setSearch((prev) => ({ ...prev, caratWeights: e.target.value }))}
            />
            <span style={styles.countBadge}>{filteredCaratWeights.length}/{caratWeights.length}</span>
          </div>
        </div>
        {caratWeights.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No carat weights yet.</p>
        ) : filteredCaratWeights.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No carat weights match your search.</p>
        ) : (
          <div style={styles.cardList}>
            {filteredCaratWeights.map((carat) => (
              <div key={carat._id} style={styles.card}>
                <div style={styles.cardContent}>
                  <h4 style={styles.cardTitle}>{carat.displayName}</h4>
                  <p style={styles.cardMeta}>ID: {carat.name}</p>
                  <p style={styles.cardMeta}>Value: {carat.value} ct</p>
                </div>
                <div style={styles.cardActions}>
                  <button style={{ ...styles.button, ...styles.buttonSecondary }} onClick={() => editCarat(carat)}>Edit</button>
                  <button style={{ ...styles.button, ...styles.buttonDanger }} onClick={() => deleteCarat(carat._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderPricingTab = () => {
    const shankModifiers = (pricing && pricing.shankVariantModifiers) ? Object.fromEntries(Object.entries(pricing.shankVariantModifiers)) : {};
    const caratModifiers = (pricing && pricing.caratWeightModifiers) ? Object.fromEntries(Object.entries(pricing.caratWeightModifiers)) : {};
    const matchingModifiers = (pricing && pricing.matchingBandModifiers) ? Object.fromEntries(Object.entries(pricing.matchingBandModifiers)) : {};

    return (
      <div>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Pricing Configuration</h2>
            <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Configure base price and per-option modifiers</p>
          </div>
          <span style={styles.tag}>💲 Pricing</span>
        </div>

        {/* Base price inputs removed per request */}

        <div style={styles.formSection}>
          <h3 style={styles.sectionTitle} onClick={() => setPricingCollapsed({ ...pricingCollapsed, shank: !pricingCollapsed.shank })}>
            <span style={{ cursor: 'pointer' }}>{pricingCollapsed.shank ? '▸' : '▾'}</span>&nbsp;Shank Pricing
          </h3>
          {!pricingCollapsed.shank && (
          <div style={styles.cardList}>
            {shanks.map((s) => (
              <div key={s._id} style={styles.card}>
                <div style={styles.cardContent}>
                  <h4 style={styles.cardTitle}>{s.displayName || s.name}</h4>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input style={{ ...styles.input, width: 120 }} type="number" step="1" defaultValue={shankModifiers[s._id] ?? 0} onChange={(e) => {
                    const v = Number(e.target.value) || 0;
                    setPricing({ ...pricing, shankVariantModifiers: { ...(pricing?.shankVariantModifiers || {}), [s._id]: v } });
                  }} />
                  <button type="button" style={{ ...styles.button, ...styles.buttonSecondary }} onClick={async () => {
                    const val = Number(pricing?.shankVariantModifiers?.[s._id] ?? 0);
                    try {
                      await axios.put(`${API_URL}/admin/pricing/shank/${s._id}`, { value: val });
                      toast.success('Shank modifier saved');
                      fetchPricing();
                    } catch (err) {
                      console.error(err);
                      toast.error('Failed to save shank modifier');
                    }
                  }}>Save</button>
                  {/* Delete removed: pricing entries should always exist (use 0 to disable) */}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

        <div style={styles.formSection}>
          <h3 style={styles.sectionTitle} onClick={() => setPricingCollapsed({ ...pricingCollapsed, carat: !pricingCollapsed.carat })}>
            <span style={{ cursor: 'pointer' }}>{pricingCollapsed.carat ? '▸' : '▾'}</span>&nbsp;Carat Pricing
          </h3>
          {!pricingCollapsed.carat && (
          <div style={styles.cardList}>
            {caratWeights.map((c) => (
              <div key={c._id} style={styles.card}>
                <div style={styles.cardContent}>
                  <h4 style={styles.cardTitle}>{c.displayName || c.name}</h4>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input style={{ ...styles.input, width: 120 }} type="number" step="1" defaultValue={caratModifiers[c._id] ?? 0} onChange={(e) => {
                    const v = Number(e.target.value) || 0;
                    setPricing({ ...pricing, caratWeightModifiers: { ...(pricing?.caratWeightModifiers || {}), [c._id]: v } });
                  }} />
                  <button type="button" style={{ ...styles.button, ...styles.buttonSecondary }} onClick={async () => {
                    const val = Number(pricing?.caratWeightModifiers?.[c._id] ?? 0);
                    try {
                      await axios.put(`${API_URL}/admin/pricing/carat/${c._id}`, { value: val });
                      toast.success('Carat modifier saved');
                      fetchPricing();
                    } catch (err) {
                      console.error(err);
                      toast.error('Failed to save carat modifier');
                    }
                  }}>Save</button>
                  {/* Delete removed: pricing entries should always exist (use 0 to disable) */}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

        <div style={styles.formSection}>
          <h3 style={styles.sectionTitle} onClick={() => setPricingCollapsed({ ...pricingCollapsed, matching: !pricingCollapsed.matching })}>
            <span style={{ cursor: 'pointer' }}>{pricingCollapsed.matching ? '▸' : '▾'}</span>&nbsp;Matching Band Pricing 
          </h3>
          {!pricingCollapsed.matching && (
          <div style={styles.cardList}>
            {shanks.map((s) => (
              <div key={s._id} style={styles.card}>
                <div style={styles.cardContent}>
                  <h4 style={styles.cardTitle}>{s.displayName || s.name}</h4>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <label style={{ ...styles.label, marginBottom: 0 }}>Matching Band</label>
                    <input style={{ ...styles.input, width: 120 }} type="number" step="1" defaultValue={matchingModifiers[`${s._id}_band`] ?? matchingModifiers[`${s._id}_band1`] ?? 0} onChange={(e) => {
                      const v = Number(e.target.value) || 0;
                      setPricing({ ...pricing, matchingBandModifiers: { ...(pricing?.matchingBandModifiers || {}), [`${s._id}_band`]: v } });
                    }} />
                  </div>
                  <button type="button" style={{ ...styles.button, ...styles.buttonSecondary }} onClick={async () => {
                    const val = Number(pricing?.matchingBandModifiers?.[`${s._id}_band`] ?? pricing?.matchingBandModifiers?.[`${s._id}_band1`] ?? 0);
                    try {
                      await axios.put(`${API_URL}/admin/pricing/matching/${s._id}`, { value: val });
                      toast.success('Matching band modifier saved');
                      fetchPricing();
                    } catch (err) {
                      console.error(err);
                      toast.error('Failed to save matching band modifier');
                    }
                  }}>Save</button>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>
    );
  };

  const renderActiveTab = () => {
    if (activeTab === 'heads') return renderHeadTab();
    if (activeTab === 'shanks') return renderShankTab();
    if (activeTab === 'shankCategories') return renderShankCategoryTab();
    if (activeTab === 'diamondShapes') return renderShapeTab();
    if (activeTab === 'settingStyles') return renderStyleTab();
    if (activeTab === 'caratWeights') return renderCaratTab();
    if (activeTab === 'pricing') return renderPricingTab();
    return null;
  };

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <div style={{ ...styles.wrapper, gridTemplateColumns: isCompactLayout ? '1fr' : '280px 1fr' }}>
      <aside style={{ ...styles.aside, position: isCompactLayout ? 'relative' : 'sticky', height: isCompactLayout ? 'auto' : '100vh' }}>
        <div style={styles.asideHeader}>
          <div style={styles.asideLogoIcon}>💍</div>
          <h1 style={styles.asideTitle}>Admin</h1>
        </div>
        <nav
          style={{
            ...styles.asideNav,
            flexDirection: isCompactLayout ? 'row' : 'column',
            flexWrap: isCompactLayout ? 'wrap' : 'nowrap',
            padding: isCompactLayout ? '12px 12px 16px' : styles.asideNav.padding
          }}
        >
          {navItems.map((item) => (
            <button
              key={item.key}
              style={{
                ...styles.asideNavItem,
                ...(activeTab === item.key
                  ? styles.asideNavItemActive
                  : hoveredNav === item.key
                    ? styles.asideNavItemHover
                    : styles.asideNavItemDefault),
                flex: isCompactLayout ? '1 1 calc(50% - 8px)' : '0 0 auto',
                minWidth: isCompactLayout ? '180px' : 'auto'
              }}
              onMouseEnter={() => setHoveredNav(item.key)}
              onMouseLeave={() => setHoveredNav('')}
              onClick={() => setActiveTab(item.key)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div style={{ ...styles.asideStats, gridTemplateColumns: isCompactLayout ? 'repeat(4, 1fr)' : '1fr 1fr' }}>
          <div style={styles.asideStat}>
            <span style={styles.asideStatLabel}>Heads</span>
            <span style={styles.asideStatValue}>{heads.length}</span>
          </div>
          <div style={styles.asideStat}>
            <span style={styles.asideStatLabel}>Shanks</span>
            <span style={styles.asideStatValue}>{shanks.length}</span>
          </div>
          <div style={styles.asideStat}>
            <span style={styles.asideStatLabel}>Shapes</span>
            <span style={styles.asideStatValue}>{diamondShapes.length}</span>
          </div>
          <div style={{ ...styles.asideStat, borderRight: 'none' }}>
            <span style={styles.asideStatLabel}>Styles</span>
            <span style={styles.asideStatValue}>{settingStyles.length}</span>
          </div>
        </div>
      </aside>

      <main style={styles.main}>
        <div style={{ ...styles.container, padding: isCompactLayout ? '24px 18px' : styles.container.padding }}>{renderActiveTab()}</div>
      </main>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Admin />);
