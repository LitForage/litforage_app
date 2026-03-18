import React, { useState, useEffect, useRef } from 'react';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Browser } from '@capacitor/browser';
import { registerPlugin } from '@capacitor/core';
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'qrcode';
import {
  Search, BookOpen, Leaf, Save, ExternalLink, Filter, Quote,
  CheckCircle, Loader2, AlertCircle, User, Calendar, MinusCircle,
  Info, Coffee, X, ArrowDownCircle, Download, FileText, Trash2,
  Upload, Database, Palette, RefreshCw, QrCode, ScanLine,
  ArrowDownAZ, Clock, Globe, FolderOpen, HardDrive,
  Edit2, PlusCircle, CheckSquare, Square, FileEdit, GripVertical, FileOutput
} from 'lucide-react';

const ScholarBrowser = registerPlugin('ScholarBrowser');

const DOI_REGEX = /\b(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)\b/i;
const ISBN13_LOOSE = /(97[89][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9])/;
const ISBN10_LOOSE = /\b([01][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9X])\b/i;

const COLOR_MAP = ['bg-white', 'bg-red-500', 'bg-orange-400', 'bg-red-400', 'bg-amber-400', 'bg-lime-400', 'bg-emerald-400'];
const MAX_SACKS = 50;

const sortAcorns = (items) => {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => {
    const authorA = a && a.author ? String(a.author).toUpperCase() : "UNKNOWN";
    const authorB = b && b.author ? String(b.author).toUpperCase() : "UNKNOWN";
    if (authorA < authorB) return -1;
    if (authorA > authorB) return 1;
    return 0;
  });
};

const getTimestamp = () => {
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

const btnBase = "text-xs font-bold px-4 py-2.5 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-sm";
const iconBtn = "p-2 text-slate-400 hover:text-[#2d5a27] hover:bg-green-50 rounded-lg transition-colors";
const exportBtn = "text-sm font-bold text-slate-600 bg-slate-100 py-3 rounded-lg hover:bg-slate-200 transition-colors w-full";
const actBtn = "p-3 bg-black/5 hover:bg-black/15 rounded-xl transition-colors shrink-0";

const SharedModal = ({ title, subtitle, icon, iconColor, onCancel, onSubmit, submitText, submitColor, submitDisabled, children }) => (
  <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-sm border border-slate-100 flex flex-col animate-in zoom-in-95">
          {icon && <div className={`w-16 h-16 ${iconColor} rounded-full flex items-center justify-center mb-4 mx-auto`}>{icon}</div>}
          <h3 className={`font-serif font-bold text-xl text-slate-800 mb-1 ${icon ? 'text-center' : ''}`}>{title}</h3>
          <p className={`text-xs font-medium text-slate-500 mb-5 leading-relaxed ${icon ? 'text-center' : ''}`}>{subtitle}</p>
          <form onSubmit={onSubmit} className="w-full flex flex-col">
              {children}
              <div className="flex gap-3 w-full mt-2">
                  <button type="button" onClick={onCancel} className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors rounded-xl">Cancel</button>
                  <button type="submit" disabled={submitDisabled} className={`flex-1 py-3 text-sm font-bold text-white transition-colors rounded-xl shadow-sm flex items-center justify-center gap-2 ${submitColor} disabled:opacity-50`}>{submitText}</button>
              </div>
          </form>
      </div>
  </div>
);

const CritterLogo = () => (
  <div className="w-24 h-24 bg-[#2d5a27] rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4">
    <span className="text-5xl">🐿️</span>
  </div>
);

const InputRow = ({ label, val, onChange, placeholder, required = false }) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</label>
    <input required={required} type="text" value={val} onChange={onChange} className="w-full p-3 text-sm rounded-xl border border-slate-200 focus:border-[#2d5a27] focus:ring-1 focus:ring-[#2d5a27] outline-none" placeholder={placeholder} />
  </div>
);

export default function App() {
 const [activeTab, setActiveTab] = useState('search');
 const [showAbout, setShowAbout] = useState(false);
 const [showClearConfirm, setShowClearConfirm] = useState(false);
 const [query, setQuery] = useState('');
 const [author, setAuthor] = useState('');
 const [startYear, setStartYear] = useState('');
 const [endYear, setEndYear] = useState('');
 const [exclude, setExclude] = useState('');
 const [filterType, setFilterType] = useState('journal-article');
 const [oaOnly, setOaOnly] = useState(true);
 const [apiSource, setApiSource] = useState('crossref');

 const [activePalette, setActivePalette] = useState(null);
 const [results, setResults] = useState([]);
 const [apiCursor, setApiCursor] = useState(0);

 const [smartInput, setSmartInput] = useState('');
 const [smartLoading, setSmartLoading] = useState(false);
 const [activeQR, setActiveQR] = useState(null);
 const [isGeneratingQR, setIsGeneratingQR] = useState(false);
 const [updatingId, setUpdatingId] = useState(null);
 const [isScanning, setIsScanning] = useState(false);
 const [isAlphabetized, setIsAlphabetized] = useState(false);
 const [isImporting, setIsImporting] = useState(false);

 const [loading, setLoading] = useState(false);
 const [loadingMore, setLoadingMore] = useState(false);
 const [error, setError] = useState(null);
 const [showFilters, setShowFilters] = useState(false);
 const [notification, setNotification] = useState(null);
 const fileInputRef = useRef(null);
 const resultsRef = useRef(null);

 const [localSacks, setLocalSacks] = useState([]);
 const localSacksRef = useRef(localSacks);
 useEffect(() => { localSacksRef.current = localSacks; }, [localSacks]);

 const [activeSackId, setActiveSackId] = useState(null);
 const activeSack = localSacks.find(s => s.id === activeSackId) || localSacks[0];
 const savedItems = activeSack ? activeSack.acorns : [];
 const displayedItems = isAlphabetized ? sortAcorns(savedItems) : savedItems;

 const [showLoadLocal, setShowLoadLocal] = useState(false);
 const [draggedIndex, setDraggedIndex] = useState(null);
 const [deleteTarget, setDeleteTarget] = useState(null);
 const [renameTarget, setRenameTarget] = useState(null);
 const [renameInput, setRenameInput] = useState('');
 const [isEditModalOpen, setIsEditModalOpen] = useState(false);
 const [showSackDropdown, setShowSackDropdown] = useState(false);
 const [editForm, setEditForm] = useState({});
 const [isWriting, setIsWriting] = useState(false);
 const [showTextExportModal, setShowTextExportModal] = useState(false);
 const [textExportStyle, setTextExportStyle] = useState('APA');

 const extractIdentifier = (text) => {
   let clean = text.trim();
   let doiMatchUrl = clean.match(/^https?:\/\/doi\.org\/(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)$/i);
   let doiMatchStrict = clean.match(/^10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+$/i);
   let doiMatchLoose = clean.match(DOI_REGEX);
   let exactDoi = doiMatchUrl ? doiMatchUrl[1] : (doiMatchStrict ? doiMatchStrict[0] : (doiMatchLoose ? doiMatchLoose[1] : null));
   let isbnMatch = clean.match(ISBN13_LOOSE) || clean.match(ISBN10_LOOSE);
   return { exactDoi, isbnMatch };
 };

 const encodeAcorn = (item) => {
   const e = encodeURIComponent;
   let out = `a=${e(String(item.author || 'Unknown').substring(0, 32))}`;
   out += `&y=${e(String(item.year || 'n.d.').substring(0, 4))}`;
   out += `&t=${e(String(item.title || 'Unknown').substring(0, 128))}`;
   if (item.doi && item.doi !== 'N/A' && !String(item.doi).startsWith('ISBN:')) {
       out += `&d=${e(item.doi)}`;
   } else if (item.doi && item.doi !== 'N/A' && String(item.doi).startsWith('ISBN:')) {
       out += `&d=${e(item.doi)}`;
       if (item.url && item.url !== 'N/A') out += `&u=${e(String(item.url).substring(0, 2083))}`;
   } else if (item.url && item.url !== 'N/A') {
       out += `&u=${e(String(item.url).substring(0, 2083))}`;
   }
   out += `&j=${e(String(item.journal || 'Web').substring(0, 32))}`;
   out += `&ty=${e(String(item.type || 'journal-article').substring(0, 16))}`;
   let cIndex = COLOR_MAP.indexOf(item.color);
   if (cIndex > 0) out += `&c=${e(String(cIndex).substring(0, 2))}`;
   return out;
 };

 const decodeAcorn = (encodedStr) => {
   const p = new URLSearchParams(encodedStr);
   const doi = p.get('d') || 'N/A';
   let url = p.get('u') || 'N/A';
   if (url === 'N/A' && doi !== 'N/A' && !String(doi).startsWith('ISBN:')) url = `https://doi.org/${doi}`;
   const cIndex = parseInt(p.get('c') || '0', 10);
   const color = COLOR_MAP[cIndex] || COLOR_MAP[0];
   return {
       id: doi !== 'N/A' ? doi : 'acorn_' + Date.now() + Math.random(),
       author: p.get('a') || 'Unknown', year: p.get('y') || 'n.d.', title: p.get('t') || 'Unknown',
       journal: p.get('j') || 'Web', doi: doi, url: url, type: p.get('ty') || 'journal-article',
       color: color, rawString: encodedStr
   };
 };

 const formatAuthorOnIngest = (authorStr) => {
   if (!authorStr || authorStr.toLowerCase().includes('unknown')) return 'Unknown Author';
   let authors = authorStr.split(/,| and |&|;/);
   for (let i = 0; i < authors.length; i++) {
       let current = authors[i].trim();
       if (!current.includes(',') && current.includes(' ')) {
           let parts = current.split(' ');
           if (parts.length > 1) {
               let last = parts.pop();
               authors[i] = last + ', ' + parts.join(' ');
           }
       } else authors[i] = current;
   }
   return authors.filter(a => a).join('; ');
 };

 const shortenDOI = async (doi) => {
   if (!doi || doi === 'N/A' || String(doi).startsWith('ISBN:') || String(doi).length <= 32) return doi;
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 10000);
   try {
       const res = await fetch(`https://shortdoi.org/${encodeURIComponent(doi)}?format=json`, { signal: controller.signal });
       clearTimeout(timeoutId);
       if (!res.ok) return doi;
       const data = await res.json();
       return (data.ShortDOI && /^10\/[a-zA-Z0-9]+$/.test(data.ShortDOI)) ? data.ShortDOI : doi;
   } catch(e) {
       clearTimeout(timeoutId); return doi;
   }
 };

 const stealthShorten = async (item) => {
    if (!item.doi || item.doi === 'N/A' || item.doi.length <= 32 || item.doi.startsWith('ISBN:')) return;
    const shortDoi = await shortenDOI(item.doi);
    if (shortDoi && shortDoi !== item.doi) {
        setLocalSacks(prev => prev.map(sack => {
            if (sack.acorns.some(a => a.id === item.id)) {
                const updated = sack.acorns.map(a => a.id === item.id ? { ...a, doi: shortDoi } : a);
                writeSackFile(sack.filename, updated);
                return { ...sack, acorns: updated };
            }
            return sack;
        }));
    }
 };

 const showNotify = (msg) => {
   setNotification(msg);
   setTimeout(() => setNotification(null), 3000);
 };

 const writeSackFile = async (filename, items) => {
     const content = items.map(encodeAcorn).join('|');
     await Filesystem.writeFile({ path: filename, data: content, directory: Directory.Data, encoding: Encoding.UTF8 });
 };

 const updateActiveSackData = async (newAcorns) => {
     if (!activeSack) return;
     await writeSackFile(activeSack.filename, newAcorns);
     setLocalSacks(prev => prev.map(s => s.id === activeSackId ? { ...s, count: newAcorns.length, acorns: newAcorns, color: newAcorns.length > 0 ? newAcorns[0].color : s.color } : s));
 };

 const saveManifest = async (sacksArray) => {
     try {
         const order = sacksArray.map(s => s.filename);
         await Filesystem.writeFile({ path: 'sack_manifest.json', data: JSON.stringify(order), directory: Directory.Data, encoding: Encoding.UTF8 });
     } catch(e) { console.error("Failed to save manifest", e); }
 };

 const createNewSack = async (initialAcorns = []) => {
     const currentSacks = localSacksRef.current || [];
     if (currentSacks.length >= MAX_SACKS) {
         showNotify("Maximum limit of 50 Sacks reached.");
         return null;
     }
     const nextNum = Math.max(0, ...currentSacks.map(s => parseInt(s.name.replace('Sack ', '')) || 0)) + 1;
     const newFilename = `Sack_${nextNum}_${Date.now()}.acorn`;
     const newSackName = `Sack ${nextNum}`;
     await writeSackFile(newFilename, initialAcorns);

     const newSackObj = {
         id: newFilename, filename: newFilename, name: newSackName,
         color: COLOR_MAP[Math.floor(Math.random() * COLOR_MAP.length)],
         count: initialAcorns.length, acorns: initialAcorns
     };
     const newSacks = [newSackObj, ...currentSacks];
     setLocalSacks(newSacks);
     setActiveSackId(newSackObj.id);
     localStorage.setItem('litforage_active_sack', newSackObj.id);
     await saveManifest(newSacks);
     return newSackObj;
 };

 const fetchLocalSacks = async () => {
     try {
         const result = await Filesystem.readdir({ directory: Directory.Data, path: '' });
         let manifest = [];
         try {
             const manifestData = await Filesystem.readFile({ directory: Directory.Data, path: 'sack_manifest.json', encoding: Encoding.UTF8 });
             manifest = JSON.parse(manifestData.data);
         } catch(e) {}

         let sacks = [];
         for (const file of result.files) {
             const filename = file.name || file;
             if (filename.endsWith('.acorn')) {
                 const data = await Filesystem.readFile({ directory: Directory.Data, path: filename, encoding: Encoding.UTF8 });
                 const acornsStr = data.data.split('|').filter(s => s.trim());
                 const acorns = acornsStr.map(decodeAcorn);
                 let sName = filename.split('_')[0];
                 if (filename.startsWith('Sack_')) sName = `Sack ${filename.split('_')[1]}`;
                 const sColor = acorns[0] ? acorns[0].color : COLOR_MAP[Math.floor(Math.random() * COLOR_MAP.length)];
                 sacks.push({ id: filename, filename, name: sName, color: sColor, count: acorns.length, acorns });
             }
         }

         if (manifest.length > 0) {
             sacks.sort((a, b) => {
                 let indexA = manifest.indexOf(a.filename);
                 let indexB = manifest.indexOf(b.filename);
                 if (indexA === -1) indexA = 999;
                 if (indexB === -1) indexB = 999;
                 return indexA - indexB;
             });
         } else {
             sacks.sort((a,b) => b.filename.localeCompare(a.filename));
         }

         if (sacks.length === 0) {
             const newSack = await createNewSack([]);
             sacks = [newSack];
         }

         setLocalSacks(sacks);
         const lastActive = localStorage.getItem('litforage_active_sack');
         if (lastActive && sacks.find(s => s.id === lastActive)) setActiveSackId(lastActive);
         else { setActiveSackId(sacks[0].id); localStorage.setItem('litforage_active_sack', sacks[0].id); }
     } catch(e) { console.error("fetchSacks error:", e); }
 };

 useEffect(() => { fetchLocalSacks(); }, []);

 const handleAddAcorn = async (newAcorn) => {
     if (isWriting) return;
     setIsWriting(true);
     try {
         if (!activeSack) return;
         if (savedItems.some(a => a.id === newAcorn.id)) {
             showNotify("Acorn already in Sack!");
             return;
         }

         if (savedItems.length >= 100) {
             const newSack = await createNewSack([newAcorn]);
             if (newSack) showNotify(`Past 100 acorn limit. Created ${newSack.name} and added citation there.`);
         } else {
             const updatedAcorns = [newAcorn, ...savedItems];
             await updateActiveSackData(updatedAcorns);
             showNotify("Acorn Added & Autosaved!");
         }
         stealthShorten(newAcorn);
     } finally {
         setIsWriting(false);
     }
 };

 const removeAcorn = async (id) => {
     if (isWriting) return;
     setIsWriting(true);
     try {
         const updated = savedItems.filter(item => item.id !== id);
         await updateActiveSackData(updated);
         showNotify("Removed. Sack autosaved.");
     } finally {
         setIsWriting(false);
     }
 };

 const toggleSave = (item) => {
   if (savedItems.find(i => i.id === item.id)) removeAcorn(item.id);
   else handleAddAcorn({ ...item, color: COLOR_MAP[0] });
 };

 useEffect(() => {
   let listener;
   const setupListener = async () => {
     try {
       listener = await ScholarBrowser.addListener('onAcornCaptured', (data) => {
         if (data.isRichJson) {
             const parsed = JSON.parse(data.payload);
             let item = {
                 id: 'browse_' + Date.now(),
                 title: parsed.title || 'Unknown Title',
                 url: parsed.url || 'N/A',
                 doi: parsed.doi || 'N/A',
                 type: parsed.type || 'journal-article',
                 author: parsed.author || 'Unknown Author',
                 year: parsed.year || new Date().getFullYear().toString(),
                 journal: parsed.journal || 'Web',
                 color: COLOR_MAP[0]
             };
             handleAddAcorn(item);
         } else {
             let item = { id: 'browse_' + Date.now(), title: data.title || 'Unknown Title', url: data.url || 'N/A', doi: data.doi || 'N/A', type: 'journal-article', color: COLOR_MAP[0] };
             if (data.authorsAndJournal) {
                 const parts = data.authorsAndJournal.split(' - ');
                 item.author = formatAuthorOnIngest(parts[0] || 'Unknown Author');
                 const journalParts = (parts[1] || '').split(', ');
                 item.journal = journalParts[0] || 'Google Scholar';
                 item.year = journalParts[1]?.match(/\d{4}/)?.[0] || new Date().getFullYear().toString();
             } else {
                 item.author = 'Unknown Author'; item.year = new Date().getFullYear().toString(); item.journal = 'Publisher Website';
             }
             handleAddAcorn(item);
         }
       });
     } catch(e) {}
   };
   setupListener();
   return () => { if(listener) listener.remove(); };
 }, [activeSack]);

 const cleanText = (text) => text ? text.toString().replace(/<[^>]*>?/gm, '').replace(/&amp;/g, "&").replace(/&quot;/g, '"') : "";
 const truncateTitle = (title) => {
   if (!title) return ""; const words = title.split(' ');
   return words.length > 15 ? words.slice(0, 15).join(' ') + '...' : title;
 };

 const populateFromCrossref = (item, data) => {
   item.title = cleanText(data.title?.[0] || item.title);
   const authorRaw = data.author?.map(a => a.given ? `${a.family}, ${a.given}` : a.family).join('; ');
   item.author = formatAuthorOnIngest(authorRaw || item.author);
   item.year = data.issued?.['date-parts']?.[0]?.[0] || item.year;
   item.journal = data['container-title']?.[0] || item.journal;
   item.url = data.URL || item.url; item.doi = data.DOI || item.doi; item.type = data.type || item.type;
 };

 const populateFromGoogleBooks = (item, data) => {
   item.title = cleanText(data.title || item.title);
   item.author = formatAuthorOnIngest(data.authors?.join('; ') || item.author);
   item.year = data.publishedDate?.substring(0,4) || item.year;
   item.journal = data.publisher || item.journal;
   item.url = data.infoLink || item.url;
   item.doi = data.industryIdentifiers?.find(id => id.type.includes('ISBN'))?.identifier || item.doi;
   item.type = 'book';
 };

 const populateFromOpenLibrary = (item, data, isbn) => {
   item.title = cleanText(data.title || item.title);
   item.author = formatAuthorOnIngest(data.authors?.map(a => a.name).join('; ') || item.author);
   item.year = data.publish_date?.match(/\d{4}/)?.[0] || item.year;
   item.journal = data.publishers?.[0]?.name || item.journal;
   item.url = data.url || item.url; item.doi = isbn || item.doi; item.type = 'book';
 };

 const safeFetch = async (url, { retries = 2 } = {}) => {
   for (let i = 0; i <= retries; i++) {
     try {
       const response = await fetch(url);
       if (response.ok) return await response.json();
       if (i < retries && (response.status === 429 || response.status >= 500)) {
          await new Promise(r => setTimeout(r, Math.floor(Math.random() * 2000) + 2000)); continue;
       }
       if (response.status === 429) throw new Error("Rate limit exceeded.");
       if (!response.ok) throw new Error(`API Error: ${response.status}`);
       return await response.json();
     } catch (e) {
       if (i < retries) { await new Promise(r => setTimeout(r, Math.floor(Math.random() * 2000) + 2000)); continue; }
       throw e;
     }
   }
 };

 const fetchBookFallback = async (isbn, titleText, item) => {
   let gbQuery = isbn ? `isbn:${encodeURIComponent(isbn)}` : encodeURIComponent(titleText);
   try {
     const gbResponse = await safeFetch(`https://www.googleapis.com/books/v1/volumes?q=${gbQuery}&maxResults=1`);
     if (gbResponse?.items?.length > 0) { populateFromGoogleBooks(item, gbResponse.items[0].volumeInfo); return true; }
   } catch (e) {}

   let olQuery = isbn ? encodeURIComponent(isbn) : encodeURIComponent(titleText);
   try {
     const olData = await safeFetch(`https://openlibrary.org/search.json?q=${olQuery}`);
     if (olData?.docs?.length > 0) { populateFromOpenLibrary(item, olData.docs[0], isbn ? `ISBN:${isbn}` : 'N/A'); return true; }
   } catch (e) {}

   try {
     const crData = await safeFetch(`https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(titleText)}&filter=type:book&rows=1`);
     if (crData?.message?.items?.length > 0) {
         const crItem = crData.message.items[0]; populateFromCrossref(item, crItem); item.type = 'book';
         if (crItem.ISBN && crItem.ISBN.length > 0) item.doi = `ISBN:${crItem.ISBN[0].split('/').pop().replace(/[^0-9X]/gi, '')}`;
         return true;
     }
   } catch (e) {}
   return false;
 };

 const handleSmartPrefill = async (e) => {
   if(e && e.preventDefault) e.preventDefault();
   if (!smartInput.trim()) return;
   setSmartLoading(true);
   try {
     let text = smartInput.trim();
     if (text.includes('a=') && text.includes('&y=') && text.includes('&t=')) {
         try {
             const decodedItem = decodeAcorn(text);
             setEditForm(prev => ({ ...prev, ...decodedItem, isBook: decodedItem.type === 'book' }));
             showNotify("Fields pre-filled from Acorn!");
             setSmartInput('');
             setSmartLoading(false);
             return;
         } catch(decodeErr) {}
     }
     const { exactDoi, isbnMatch } = extractIdentifier(text);
     let item = { id: 'smart_' + Date.now(), title: text.length > 80 ? text.substring(0, 80) + '...' : text, author: 'Unknown Author', year: new Date().getFullYear().toString(), journal: 'Manual Entry', url: 'N/A', type: 'journal-article', doi: 'N/A', color: COLOR_MAP[0] };

     if (exactDoi) {
       const data = await safeFetch(`https://api.crossref.org/works/${exactDoi}`);
       if (data?.message) populateFromCrossref(item, data.message); else throw new Error("DOI not found");
     } else if (isbnMatch) {
         let cleanIsbn = isbnMatch[0].replace(/[^0-9X]/gi, ''); item.type = 'book'; item.doi = `ISBN:${cleanIsbn}`;
         const found = await fetchBookFallback(cleanIsbn, text, item);
         if (!found) throw new Error("Book not found");
     } else {
       const crData = await safeFetch(`https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(text)}&rows=1`);
       if (crData?.message?.items?.length > 0) populateFromCrossref(item, crData.message.items[0]);
       else await fetchBookFallback(null, text, item);
     }
     setEditForm(prev => ({ ...prev, ...item, isBook: item.type === 'book' }));
     showNotify("Fields pre-filled!");
   } catch (err) {
     const fallback = { id: 'smart_' + Date.now(), title: smartInput.trim(), author: 'Unknown Author', year: 'n.d.', journal: 'Manual Entry', url: 'N/A', doi: 'N/A', type: 'journal-article', color: COLOR_MAP[0] };
     setEditForm(prev => ({ ...prev, ...fallback, isBook: fallback.type === 'book' }));
     showNotify("Smart pre-fill failed. Partial entry populated.");
   } finally { setSmartLoading(false); setSmartInput(''); }
 };

 const handleUpdateItem = async (currentItem) => {
   if (isWriting) return;
   setUpdatingId(currentItem.id);
   setIsWriting(true);
   try {
     const originalDoi = currentItem.doi; const originalUrl = currentItem.url; const originalType = currentItem.type;
     let text = currentItem.doi !== 'N/A' ? currentItem.doi : (currentItem.title !== 'Unknown Title' ? currentItem.title : '');
     const { exactDoi, isbnMatch } = extractIdentifier(text);
     let updatedItem = { ...currentItem };

     if (exactDoi) {
       const data = await safeFetch(`https://api.crossref.org/works/${exactDoi}`);
       if (data?.message) populateFromCrossref(updatedItem, data.message);
     } else if (isbnMatch) {
       updatedItem.type = 'book'; await fetchBookFallback(isbnMatch[0].replace(/[^0-9X]/gi, ''), text, updatedItem);
     } else if (originalType === 'book') {
       await fetchBookFallback(null, text, updatedItem);
     } else {
       const crData = await safeFetch(`https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(text)}&rows=1`);
       if (crData?.message?.items?.length > 0) populateFromCrossref(updatedItem, crData.message.items[0]);
       else await fetchBookFallback(null, text, updatedItem);
     }

     if (originalDoi !== 'N/A') updatedItem.doi = originalDoi;
     if (updatedItem.url === 'N/A' && originalDoi === updatedItem.doi) updatedItem.url = originalUrl;
     if (originalType === 'book') updatedItem.type = 'book';

     const newArray = savedItems.map(i => i.id === currentItem.id ? updatedItem : i);
     await updateActiveSackData(newArray);
     showNotify("Acorn Updated!");
     stealthShorten(updatedItem);
   } catch (err) { showNotify("Update failed."); } finally { setUpdatingId(null); setIsWriting(false); }
 };

 const handleGenerateQR = async (item) => {
   try {
     const encodedString = encodeAcorn(item);
     const qrDataUrl = await QRCode.toDataURL(encodedString, { width: 300, margin: 1 });
     setActiveQR({ url: qrDataUrl, item: item });
   } catch(e) { showNotify("QR Generation failed"); }
 };

 const downloadBrandedQR = async () => {
   setIsGeneratingQR(true);
   try {
     const { url, item } = activeQR;
     const authorLast = item.author ? item.author.split(';')[0].split(',')[0].trim().replace(/[^a-zA-Z]/g, '') : 'Unknown';
     const titleShort = item.title ? (item.title.length > 15 ? item.title.substring(0, 15) + '...' : item.title) : 'Unknown';
     const caption = `${authorLast}, ${item.year || 'n.d.'}, ${titleShort}`;

     const img = new Image();
     img.onload = async () => {
       const canvas = document.createElement('canvas');
       canvas.width = 400; canvas.height = 460; const ctx = canvas.getContext('2d');
       ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
       ctx.strokeStyle = '#bbf7d0'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
       ctx.fillStyle = '#2d5a27'; ctx.font = 'bold 28px serif'; ctx.textAlign = 'center'; ctx.fillText('🐿️ LitForage', canvas.width / 2, 45);
       ctx.fillStyle = '#475569'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(caption, canvas.width / 2, 430);
       ctx.drawImage(img, 50, 70, 300, 300);
       const base64Data = canvas.toDataURL('image/png').split(',')[1];
       const filename = `LitForage_QR_${authorLast}_${item.year || 'nd'}_${getTimestamp()}.png`.replace(/[^a-zA-Z0-9_\-\.]/g, '');

       try {
         await Filesystem.writeFile({ path: filename, data: base64Data, directory: Directory.Cache });
         const uriResult = await Filesystem.getUri({ directory: Directory.Cache, path: filename });
         await Share.share({ title: "LitForage QR", files: [uriResult.uri], dialogTitle: "Save or Share QR Acorn" });
         showNotify("QR Shared Successfully!"); setActiveQR(null);
       } catch(e) { showNotify("Failed to share image."); }
       setIsGeneratingQR(false);
     };
     img.src = url;
   } catch(err) { setIsGeneratingQR(false); }
 };

 useEffect(() => {
   let html5QrCode;
   if (isScanning) {
     setTimeout(() => {
       html5QrCode = new Html5Qrcode("reader");
       html5QrCode.start(
         { facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
         (decodedText) => {
           html5QrCode.stop().then(() => setIsScanning(false)).catch(console.error);
           handleScanResult(decodedText);
         }, (err) => { }
       ).catch(err => { showNotify("Camera permission denied."); setIsScanning(false); });
     }, 100);
   }
   return () => { if (html5QrCode && html5QrCode.isScanning) html5QrCode.stop().catch(console.error); };
 }, [isScanning]);

 const handleScanResult = async (text) => {
   text = text.trim();
   if (text.includes('a=') && text.includes('&y=') && text.includes('&t=')) {
     try {
       const item = decodeAcorn(text);
       await handleAddAcorn(item);
       return;
     } catch (e) {}
   }

   const { exactDoi, isbnMatch } = extractIdentifier(text);
   if (isbnMatch) {
       showNotify("ISBN detected! Fetching book...");
       try {
           const cleanIsbn = isbnMatch[0].replace(/[^0-9X]/gi, '');
           let item = { id: 'isbn_' + cleanIsbn, title: 'Unknown Title', author: 'Unknown Author', year: 'n.d.', journal: 'Unknown Source', url: 'N/A', type: 'book', doi: `ISBN:${cleanIsbn}`, color: COLOR_MAP[0] };
           if (await fetchBookFallback(cleanIsbn, text, item)) {
               await handleAddAcorn(item); return;
           }
       } catch(err) { }
   }

   showNotify("Running smart search on scan...");
   try {
       let item = { id: 'scan_' + Date.now(), title: text.length > 80 ? text.substring(0, 80) + '...' : text, author: 'Unknown Author', year: new Date().getFullYear().toString(), journal: 'Manual Entry', url: 'N/A', type: 'journal-article', doi: 'N/A', color: COLOR_MAP[0] };
       let populated = false;
       if (exactDoi) {
           const data = await safeFetch(`https://api.crossref.org/works/${exactDoi}`);
           if (data?.message) { populateFromCrossref(item, data.message); populated = true; }
       } else {
           const crData = await safeFetch(`https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(text)}&rows=1`);
           if (crData?.message?.items?.length > 0) { populateFromCrossref(item, crData.message.items[0]); populated = true; }
           else populated = await fetchBookFallback(null, text, item);
       }
       if (!populated) item.journal = 'Raw Scan';
       await handleAddAcorn(item);
   } catch (err) {
       await handleAddAcorn({ id: 'scan_' + Date.now(), title: text.length > 80 ? text.substring(0, 80) + '...' : text, author: 'Unknown Author', year: 'n.d.', journal: 'Raw Scan', url: 'N/A', doi: 'N/A', type: 'journal-article', color: COLOR_MAP[0] });
   }
 };

 const openSource = async (url) => {
   try { await Browser.open({ url: url }); } catch (e) { window.open(url, '_blank'); }
 };

 const runForage = async (isLoadMore = false) => {
   if (!query && !author) { setError("Please enter a keyword or author."); return; }
   if (isLoadMore) setLoadingMore(true);
   else { setLoading(true); setResults([]); setApiCursor(0); setActiveTab('search'); setShowAbout(false); window.scrollTo(0,0); }
   setError(null);

   try {
     let processed = []; const currentOffset = isLoadMore ? apiCursor : 0;
     if (apiSource === 'openalex') {
       const filters = [];
       if (oaOnly) filters.push('is_oa:true');
       if (startYear) filters.push(`from_publication_date:${startYear}-01-01`);
       if (endYear) filters.push(`to_publication_date:${endYear}-12-31`);
       const typeMap = { 'journal-article': 'article', 'book': 'book', 'book-chapter': 'book-chapter', 'dissertation': 'dissertation' };
       if (filterType !== 'any') filters.push(`type:${typeMap[filterType] || 'article'}`);
       if (author) filters.push(`author.search:${author}`);
       const filterStr = filters.length > 0 ? `&filter=${filters.join(',')}` : '';
       const searchStr = query ? `&search=${encodeURIComponent(query)}` : '';
       const page = Math.floor(currentOffset / 20) + 1;
       const data = await safeFetch(`https://api.openalex.org/works?per_page=20&page=${page}${searchStr}${filterStr}`);
       if (!data.results) throw new Error("No acorns found.");
       processed = data.results.map(item => {
         const landing = item.doi || item.primary_location?.landing_page_url;
         if (!landing) return null;
         return { id: item.id, title: cleanText(item.title || item.display_name), doi: (item.doi || "").replace('https://doi.org/', '') || "N/A", author: formatAuthorOnIngest(item.authorships?.map(a => a.author.display_name).join('; ')), year: item.publication_year || "n.d.", journal: item.primary_location?.source?.display_name || "Unknown Source", url: landing, type: item.type };
       }).filter(Boolean);
     } else if (apiSource === 'doaj') {
       let qParts = [];
       if (query) qParts.push(query); if (author) qParts.push(`bibjson.author.name:"${author}"`);
       const page = Math.floor(currentOffset / 20) + 1;
       const data = await safeFetch(`https://doaj.org/api/search/articles/${encodeURIComponent(qParts.join(' AND ') || '*')}?page=${page}&pageSize=20`);
       if (!data.results) throw new Error("No acorns found.");
       processed = data.results.map(item => {
          if (!item.bibjson) return null;
          const linkObj = item.bibjson.link ? (item.bibjson.link.find(l => l.type === 'fulltext') || item.bibjson.link[0]) : null;
          if (!linkObj) return null;
          return { id: item.id, title: cleanText(item.bibjson.title), doi: item.bibjson.identifier?.find(i => i.type === 'doi')?.id || "N/A", author: formatAuthorOnIngest(item.bibjson.author?.map(a => a.name).join('; ')), year: item.bibjson.year || "n.d.", journal: item.bibjson.journal?.title || "Unknown", url: linkObj.url, type: 'journal-article' };
       }).filter(Boolean);
     } else if (apiSource === 'semanticscholar') {
       const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query + (author ? " " + author : ""))}&offset=${currentOffset}&limit=20&fields=title,authors,year,venue,externalIds,url,openAccessPdf`;
       const data = await safeFetch(url);
       if (!data.data) throw new Error("No acorns found.");
       processed = data.data.map(item => {
          let link = oaOnly ? item.openAccessPdf?.url : (item.openAccessPdf?.url || item.url);
          if (!link) return null;
          return { id: item.paperId, title: cleanText(item.title), doi: item.externalIds?.DOI || "N/A", author: formatAuthorOnIngest(item.authors?.map(a => a.name).join('; ')), year: item.year || "n.d.", journal: item.venue || "Unknown", url: link, type: 'paper' };
       }).filter(Boolean);
     } else {
       const filters = [];
       if (oaOnly) { filters.push('has-full-text:true'); filters.push('has-license:true'); }
       if (filterType !== 'any') filters.push(`type:${filterType}`);
       if (startYear) filters.push(`from-pub-date:${startYear}`);
       if (endYear) filters.push(`until-pub-date:${endYear}`);
       const filterStr = filters.length > 0 ? `&filter=${filters.join(',')}` : '';
       let queryParams = `?rows=20&offset=${currentOffset}&select=DOI,title,author,issued,container-title,type,URL`;
       if (query) queryParams += `&query=${encodeURIComponent(query)}`;
       if (author) queryParams += `&query.author=${encodeURIComponent(author)}`;
       const data = await safeFetch(`https://api.crossref.org/works${queryParams}${filterStr}`);
       if (!data.message || !data.message.items) throw new Error("No acorns found.");
       processed = data.message.items.map(item => ({
             id: item.DOI, title: cleanText(item.title ? item.title[0] : "Untitled"), doi: item.DOI,
             author: formatAuthorOnIngest(item.author ? item.author.map(a => a.given ? `${a.family}, ${a.given}` : a.family).join('; ') : "Unknown Author"),
             year: item.issued?.['date-parts']?.[0]?.[0] || "n.d.", journal: item['container-title'] ? item['container-title'][0] : "Unknown Source", url: item.URL, type: item.type
       })).filter(Boolean);
     }

     setApiCursor(currentOffset + 20);
     const finalProcessed = processed.filter(item => {
       const excludeWords = exclude.split(',').map(w => w.trim().toLowerCase()).filter(w => w);
       return !excludeWords.some(w => item.title.toLowerCase().includes(w));
     });

     if (finalProcessed.length === 0) {
       if (!isLoadMore) setError("No acorns found. Try switching sources in Advanced Options.");
       else showNotify("No more items.");
     } else {
       if (isLoadMore) {
         const newItems = finalProcessed.filter(n => !results.some(e => e.id === n.id));
         if (newItems.length === 0) showNotify("Only duplicates found.");
         setResults(prev => [...prev, ...newItems]);
       } else {
         setResults(finalProcessed);
         if (window.innerWidth < 600) setShowFilters(false);
       }
     }
   } catch (err) { setError(`${err.message} Try switching sources in Advanced Options.`); } finally { setLoading(false); setLoadingMore(false); }
 };

 const handleSearchSubmit = (e) => { e.preventDefault(); runForage(false); };

 const formatAuthorsForCitation = (authorStr) => {
     if (!authorStr || authorStr === 'Unknown Author') return 'Unknown Author.';
     const authors = authorStr.split(';').map(a => a.trim()).filter(a => a);
     if (authors.length === 0) return 'Unknown Author.';
     if (authors.length === 1) return `${authors[0]}.`;
     if (authors.length === 2) return `${authors[0]}; ${authors[1]}.`;
     return `${authors[0]}; ${authors[1]}, et al.`;
 };

 const generateStyledCitation = (item, style) => {
     const isBook = item.type === 'book' || (item.doi && String(item.doi).startsWith('ISBN:'));
     const author = formatAuthorsForCitation(item.author);
     let cleanTitle = item.title ? item.title.trim().replace(/[.,!?]$/, '') : 'Unknown Title';
     const titlePart = isBook ? `${cleanTitle}.` : `"${cleanTitle}."`;
     let journalPart = item.journal && item.journal !== 'Unknown Source' && item.journal !== 'Web' ? item.journal.trim() : '';
     const date = item.year || 'n.d.';
     const urlPart = item.url && item.url !== 'N/A' ? item.url : '';
     let doiPart = item.doi && item.doi !== 'N/A' ? item.doi : '';
     if (doiPart && !doiPart.startsWith('http') && !doiPart.startsWith('ISBN:')) doiPart = `https://doi.org/${doiPart}`;
     if (doiPart && doiPart.startsWith('ISBN:')) doiPart = doiPart.replace('ISBN:', 'ISBN: ');

     let citation = '';
     switch(style) {
         case 'APA': citation = `${author} (${date}). ${titlePart} ${journalPart ? journalPart + '.' : ''}`; break;
         case 'MLA': citation = `${author} ${titlePart} ${journalPart ? journalPart + ',' : ''} ${date}.`; break;
         case 'Chicago': citation = `${author} ${titlePart} ${journalPart} (${date}).`; break;
         case 'Harvard': citation = `${author}, ${date}. ${titlePart} ${journalPart ? journalPart + '.' : ''}`; break;
         default: citation = `${author} (${date}). ${titlePart} ${journalPart ? journalPart + '.' : ''}`;
     }
     let finalCitation = citation.replace(/\s+/g, ' ').replace(/\.\./g, '.').trim();
     if (doiPart) finalCitation += ` ${doiPart}`;
     if (urlPart && urlPart !== doiPart) finalCitation += ` ${urlPart}`;
     return finalCitation;
 };

 const generateBibTex = (item) => {
   const k = (item.author.split(';')[0].split(',')[0].replace(/[^a-zA-Z0-9]/g, '') + item.year);
   const itemType = (item.type || '').toLowerCase();
   const isBook = itemType === 'book'; const isChapter = itemType.includes('chapter');
   const bibType = isBook ? 'book' : isChapter ? 'incollection' : 'article';
   const sourceField = isBook ? 'publisher' : isChapter ? 'booktitle' : 'journal';
   const formattedAuthors = (item.author || "Unknown").split('; ').join(' and ');
   return `@${bibType}{${k}, author = {${formattedAuthors}}, title = {${item.title}}, ${sourceField} = {${item.journal}}, year = {${item.year}}, doi = {${item.doi}}}`;
 };

 const handleShareText = async (content, title) => {
   try {
     await Share.share({ title: title || "LitForage Share", text: content, dialogTitle: "Share Citation" });
     showNotify("Opened Share Menu");
   } catch (shareError) {
     try { await navigator.clipboard.writeText(content); showNotify("Copied to Clipboard"); } catch (e) { showNotify("Share & Copy Failed"); }
   }
 };

 const handleShareFile = async (content, filename) => {
   try {
     await Filesystem.writeFile({ path: filename, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 });
     const uriResult = await Filesystem.getUri({ directory: Directory.Cache, path: filename });
     await Share.share({ title: "LitForage Export", files: [uriResult.uri], dialogTitle: "Export Sack" });
     showNotify("Opened Share Menu");
   } catch (fileError) { handleShareText(content, "LitForage Export (Text Fallback)"); }
 };

 const handleExport = (format) => {
     if (savedItems.length === 0) return;
     let content = "", ext = format.toLowerCase(), ts = getTimestamp();
     const exportItems = ['CSV', 'JSON', 'BIB', 'RIS'].includes(format) ? sortAcorns(savedItems) : savedItems;

     switch(format) {
         case 'CSV':
             const rows = exportItems.map(i => `"${i.author}","${i.title.replace(/"/g, '""')}",${i.year},"${i.journal}",${i.doi},=HYPERLINK("${i.url}"),${i.type}`);
             content = ["Author,Title,Year,Journal,DOI,Link,Type", ...rows].join('\n');
             break;
         case 'JSON':
             const results = exportItems.map((item, i) => {
                 const isBook = item.type === 'book' || (item.doi && item.doi.startsWith('ISBN:'));
                 let authorArray = [];
                 if (item.author && item.author !== 'Unknown Author') {
                     authorArray = item.author.split(';').map(a => {
                         let parts = a.trim().split(',');
                         return parts.length > 1 ? { family: parts[0].trim(), given: parts[1].trim() } : { literal: a.trim() };
                     });
                 }
                 return {
                     id: "item_" + i, type: isBook ? "book" : "article-journal", title: item.title, author: authorArray,
                     issued: { "date-parts": [[parseInt(item.year) || null]] },
                     [isBook ? "publisher" : "container-title"]: item.journal !== 'Web' ? item.journal : undefined,
                     URL: item.url !== 'N/A' ? item.url : undefined, DOI: !isBook && item.doi !== 'N/A' ? item.doi : undefined,
                     ISBN: isBook && item.doi && item.doi.startsWith('ISBN:') ? item.doi.replace('ISBN:', '') : undefined
                 };
             });
             content = JSON.stringify(results, null, 2);
             break;
         case 'BIB':
             content = exportItems.map(generateBibTex).join('\n\n'); ext = 'bib';
             break;
         case 'RIS':
             content = exportItems.map(item => {
                 const isBook = item.type === 'book' || (item.doi && item.doi.startsWith('ISBN:'));
                 const risType = isBook ? 'BOOK' : (item.type || '').toLowerCase().includes('chapter') ? 'CHAP' : 'JOUR';
                 const sourceTag = isBook ? 'PB' : (item.type || '').toLowerCase().includes('chapter') ? 'T2' : 'JO';
                 const authorLines = (item.author || "Unknown").split('; ').map(a => `AU  - ${a}`).join('\n');
                 return `TY  - ${risType}\nTI  - ${item.title}\n${authorLines}\nPY  - ${item.year}\n${sourceTag}  - ${item.journal}\nDO  - ${item.doi}\nUR  - ${item.url}\nER  - `;
             }).join('\n\n');
             break;
         case 'ACORN':
             content = exportItems.map(encodeAcorn).join('|');
             ext = 'acorn.txt';
             break;
         case 'TEXT':
             setShowTextExportModal(true);
             return;
     }
     handleShareFile(content, `LitForage_${format}_${ts}.${ext}`);
 };

 const openRenameSack = (e, sack) => {
     e.stopPropagation(); setRenameTarget(sack); setRenameInput(sack.name);
 };

 const handleRenameSackSubmit = async (e) => {
     e.preventDefault();
     if (!renameTarget || !renameInput.trim()) return;
     const updatedSacks = localSacksRef.current.map(s => s.id === renameTarget.id ? { ...s, name: renameInput.trim() } : s);
     setLocalSacks(updatedSacks); setRenameTarget(null); showNotify("Sack renamed!");
     await saveManifest(updatedSacks);
 };

 const handleDeleteSackClick = (e, sack) => { e.stopPropagation(); setDeleteTarget(sack); };

 const confirmDeleteSack = async () => {
     if (!deleteTarget) return;
     try {
         await Filesystem.deleteFile({ path: deleteTarget.filename, directory: Directory.Data });
         let updatedSacks = localSacksRef.current.filter(s => s.id !== deleteTarget.id);
         if (deleteTarget.id === activeSackId) {
             const nextNum = Math.max(0, ...updatedSacks.map(s => parseInt(s.name.replace('Sack ', '')) || 0)) + 1;
             const newFilename = `Sack_${nextNum}_${Date.now()}.acorn`;
             const newSackName = `Sack ${nextNum}`;
             await writeSackFile(newFilename, []);
             const newSackObj = { id: newFilename, filename: newFilename, name: newSackName, color: COLOR_MAP[Math.floor(Math.random() * COLOR_MAP.length)], count: 0, acorns: [] };
             updatedSacks = [newSackObj, ...updatedSacks];
             setActiveSackId(newSackObj.id); localStorage.setItem('litforage_active_sack', newSackObj.id);
         }
         setLocalSacks(updatedSacks); await saveManifest(updatedSacks);
         showNotify(`${deleteTarget.name} deleted.`);
     } catch (e) { showNotify("Failed to delete sack."); } finally { setDeleteTarget(null); }
 };

 const handleDownloadSack = (e, sack) => {
     e.stopPropagation();
     const content = sack.acorns.map(encodeAcorn).join('|');
     const filename = `LitForage_${sack.name.replace(/[^a-zA-Z0-9_\-]/g, '_')}_${getTimestamp()}.acorn.txt`;
     handleShareFile(content, filename);
 };

 const handleDragStart = (e, index) => setDraggedIndex(index);
 const handleDragEnter = (e, index) => {
     if (draggedIndex === null || draggedIndex === index) return;
     const newSacks = [...localSacksRef.current];
     const draggedSack = newSacks[draggedIndex];
     newSacks.splice(draggedIndex, 1); newSacks.splice(index, 0, draggedSack);
     setDraggedIndex(index); setLocalSacks(newSacks);
 };
 const handleDragOver = (e) => e.preventDefault();
 const handleDragEnd = async () => { setDraggedIndex(null); await saveManifest(localSacksRef.current); };

 const openCreateModal = () => {
     setEditForm({ id: 'manual_' + Date.now(), title: '', author: '', year: new Date().getFullYear().toString(), journal: '', doi: 'N/A', url: 'N/A', isBook: false, color: COLOR_MAP[0] });
     setShowSackDropdown(false); setIsEditModalOpen(true);
 };

 const openEditModal = (item) => {
     setEditForm({ ...item, isBook: item.type === 'book' });
     setShowSackDropdown(false); setIsEditModalOpen(true);
 };

 const handleSaveEdit = async (e) => {
     e.preventDefault();
     if (isWriting) return;
     let updated = { ...editForm, type: editForm.isBook ? 'book' : 'journal-article' };
     delete updated.isBook;
     if (savedItems.find(i => i.id === updated.id)) {
         setIsWriting(true);
         try {
             const newArray = savedItems.map(i => i.id === updated.id ? updated : i);
             await updateActiveSackData(newArray); showNotify("Acorn Updated!");
         } finally { setIsWriting(false); }
     } else { await handleAddAcorn(updated); }
     setIsEditModalOpen(false); stealthShorten(updated);
 };

 const handleCopyToOfflineSack = async (sack) => {
     if (sack.count >= 100) { showNotify(`${sack.name} is full!`); return; }
     if (isWriting) return;
     setIsWriting(true);
     try {
         let updated = { ...editForm, type: editForm.isBook ? 'book' : 'journal-article' }; delete updated.isBook;
         const newAcorns = [updated, ...sack.acorns];
         await writeSackFile(sack.filename, newAcorns);
         showNotify(`✓ Copied to ${sack.name}`);
         setLocalSacks(prev => prev.map(s => s.id === sack.id ? { ...s, count: newAcorns.length, acorns: newAcorns } : s));
     } catch(e) { showNotify("Copy Failed"); } finally { setIsWriting(false); }
 };

 const parseLitForageCSV = (text) => {
     const items = []; const lines = text.split('\n').slice(1);
     for (const row of lines) {
         if (!row.trim()) continue;
         const m = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
         if (!m || m.length < 5) continue;
         const clean = (s) => s ? s.replace(/^"|"$/g, '').replace(/""/g, '"') : "";
         let url = clean(m[5]); if (url && url.startsWith('=HYPERLINK')) { const hMatch = url.match(/"(.*?)"/); if(hMatch) url = hMatch[1]; }
         items.push({ author: formatAuthorOnIngest(clean(m[0])), title: clean(m[1]) || 'Unknown Title', year: clean(m[2]) || 'n.d.', journal: clean(m[3]) || 'Unknown Source', doi: clean(m[4]) || 'N/A', url: url || 'N/A', type: clean(m[6]) || "journal-article", color: COLOR_MAP[0] });
     }
     return items;
 };

 const parseRIS = (text) => {
     const items = []; const entries = text.split(/ER\s+-/);
     for (let entry of entries) {
         if (!entry.trim()) continue;
         let item = { title: 'Unknown Title', author: 'Unknown Author', year: 'n.d.', journal: 'Unknown Source', doi: 'N/A', url: 'N/A', type: 'journal-article', color: COLOR_MAP[0] };
         let authors = []; const lines = entry.split('\n');
         for (let line of lines) {
             const match = line.match(/^([A-Z0-9]{2})\s+-\s+(.*)/); if (!match) continue;
             const tag = match[1]; const val = match[2].trim();
             if (tag === 'TI' || tag === 'T1') item.title = val;
             if (tag === 'AU' || tag === 'A1') authors.push(val);
             if (tag === 'PY' || tag === 'Y1') item.year = val.match(/\d{4}/)?.[0] || item.year;
             if (tag === 'JO' || tag === 'T2') item.journal = val;
             if (tag === 'DO') item.doi = val; if (tag === 'UR') item.url = val;
             if (tag === 'TY') item.type = val.toLowerCase().includes('book') ? 'book' : 'journal-article';
         }
         if (authors.length > 0) item.author = authors.map(formatAuthorOnIngest).join('; ');
         if (item.title !== 'Unknown Title') items.push(item);
     }
     return items;
 };

 const parseBibTeX = (text) => {
     const items = []; const entries = text.split(/(?=@\w+\{)/);
     for (let entry of entries) {
         if (!entry.trim()) continue;
         let item = { title: 'Unknown Title', author: 'Unknown Author', year: 'n.d.', journal: 'Unknown Source', doi: 'N/A', url: 'N/A', type: 'journal-article', color: COLOR_MAP[0] };
         const typeMatch = entry.match(/@(\w+)\{/); if (typeMatch) item.type = typeMatch[1].toLowerCase() === 'book' ? 'book' : 'journal-article';
         const extractField = (field) => {
             const regex = new RegExp(`${field}\\s*=\\s*(?:\\{([^]*?)\\}|\\"([^]*?)\\"|([^,\\s]+))`, 'i');
             const match = entry.match(regex);
             return match ? (match[1] || match[2] || match[3] || '').trim().replace(/[\{\}]/g, '') : null;
         };
         item.title = extractField('title') || item.title;
         item.author = extractField('author')?.split(/\s+and\s+/i).map(formatAuthorOnIngest).join('; ') || item.author;
         item.year = extractField('year') || item.year;
         item.journal = extractField('journal') || extractField('booktitle') || item.journal;
         item.doi = extractField('doi') || item.doi; item.url = extractField('url') || item.url;
         if (item.title !== 'Unknown Title') items.push(item);
     }
     return items;
 };

 const parseCSLJSON = (text) => {
     try {
         const data = JSON.parse(text); const items = []; const records = Array.isArray(data) ? data : [data];
         for (let record of records) {
             let authorStr = 'Unknown Author';
             if (record.author) authorStr = record.author.map(a => a.family ? (a.given ? `${a.family}, ${a.given}` : a.family) : formatAuthorOnIngest(a.literal || '')).join('; ');
             let yearStr = 'n.d.'; if (record.issued && record.issued['date-parts'] && record.issued['date-parts'][0]) yearStr = record.issued['date-parts'][0][0].toString();
             items.push({ title: record.title || 'Unknown Title', author: authorStr, year: yearStr, journal: record['container-title'] || record.publisher || 'Unknown Source', doi: record.DOI || record.ISBN || 'N/A', url: record.URL || (record.link && record.link[0]?.URL) || 'N/A', type: record.type === 'book' ? 'book' : 'journal-article', color: COLOR_MAP[0] });
         }
         return items;
     } catch(e) { console.error("Failed to parse CSL-JSON", e); return []; }
 };

 const parseAcademicFile = (fileText, fileName) => {
     const ext = fileName.split('.').pop().toLowerCase();
     if (ext === 'csv') return parseLitForageCSV(fileText);
     if (ext === 'ris') return parseRIS(fileText);
     if (ext === 'bib' || ext === 'bibtex') return parseBibTeX(fileText);
     if (ext === 'json') return parseCSLJSON(fileText);
     if (ext === 'acorn' || ext === 'txt') return fileText.split('|').filter(s => s.trim()).map(decodeAcorn);
     throw new Error("Unsupported file type. Upload .csv, .ris, .bib, .json, or .acorn.txt");
 };

 const handleImportFile = (event) => {
   const file = event.target.files[0]; if (!file) return;
   const reader = new FileReader();
   reader.onload = async (e) => {
     setIsImporting(true);
     try {
       let parsedItems = parseAcademicFile(e.target.result, file.name);
       const uniqueItems = []; const seenIds = new Set();
       for (const item of parsedItems) {
           item.id = (item.doi && item.doi !== 'N/A') ? item.doi : 'imported_' + Date.now() + Math.random();
           if (!seenIds.has(item.id)) { uniqueItems.push(item); seenIds.add(item.id); }
       }
       if (uniqueItems.length === 0) { showNotify("No new acorns found."); return; }

       let itemsLeft = [...uniqueItems];
       let updatedSacks = [...localSacksRef.current];
       let currentSack = activeSack;
       let totalSacksCreated = 0;
       let initialTotal = itemsLeft.length;

       if (currentSack && currentSack.acorns.length < 100) {
           const room = 100 - currentSack.acorns.length;
           const toAdd = itemsLeft.slice(0, room); itemsLeft = itemsLeft.slice(room);
           const finalToAdd = toAdd.filter(a => !currentSack.acorns.some(e => e.id === a.id));
           if (finalToAdd.length > 0) {
               const newAcorns = [...finalToAdd, ...currentSack.acorns];
               await writeSackFile(currentSack.filename, newAcorns);
               updatedSacks = updatedSacks.map(s => s.id === currentSack.id ? { ...s, count: newAcorns.length, acorns: newAcorns } : s);
           }
       }

       let hitLimit = false;
       while (itemsLeft.length > 0) {
           if (updatedSacks.length >= MAX_SACKS) { hitLimit = true; break; }
           const chunk = itemsLeft.slice(0, 100); itemsLeft = itemsLeft.slice(100);
           const nextNum = Math.max(0, ...updatedSacks.map(s => parseInt(s.name.replace('Sack ', '')) || 0)) + 1;
           const newFilename = `Sack_${nextNum}_${Date.now()}.acorn`;
           const newSackName = `Sack ${nextNum}`;
           await writeSackFile(newFilename, chunk);
           const newSackObj = { id: newFilename, filename: newFilename, name: newSackName, color: COLOR_MAP[Math.floor(Math.random() * COLOR_MAP.length)], count: chunk.length, acorns: chunk };
           updatedSacks = [newSackObj, ...updatedSacks]; totalSacksCreated++;
       }

       setLocalSacks(updatedSacks);
       if (updatedSacks.length > 0 && !updatedSacks.find(s => s.id === activeSackId)) setActiveSackId(updatedSacks[0].id);
       await saveManifest(updatedSacks);
       if (hitLimit) showNotify(`Hit 50 Sack limit. ${itemsLeft.length} items skipped.`);
       else showNotify(`Imported ${initialTotal} items. Created ${totalSacksCreated} sacks.`);
     } catch (err) { showNotify(err.message); } finally { setIsImporting(false); }
   };
   reader.readAsText(file); event.target.value = '';
 };

 const AcornCard = ({ item, isSavedView }) => (
   <div className={`${isSavedView ? (item.color || COLOR_MAP[0]) : 'bg-white'} rounded-xl p-5 mb-4 transition-all duration-300 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 border border-stone-50 group relative`}>
     {isSavedView && activePalette === item.id && (
       <div className="absolute bottom-12 right-0 bg-white p-2 rounded-xl shadow-xl border border-slate-100 flex gap-2 z-10 animate-in fade-in zoom-in-95">
          {COLOR_MAP.map(c => (
             <button key={c} className={`w-6 h-6 rounded-full border border-slate-200 ${c} hover:scale-110 transition-transform shadow-sm`} onClick={async () => {
                if (isWriting) return; setIsWriting(true);
                try {
                    const updated = savedItems.map(i => i.id === item.id ? {...i, color: c} : i);
                    await updateActiveSackData(updated);
                } finally { setIsWriting(false); setActivePalette(null); }
                stealthShorten({...item, color: c});
             }} />
          ))}
       </div>
     )}
     <div className="flex justify-between items-start gap-4">
       <div className="flex-1 pr-8">
         <div className="flex items-center gap-2 mb-3">
           <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider bg-white/50 px-2 py-1 rounded">{item.type.replace('-', ' ')}</span>
           {item.year !== 'n.d.' && <span className="text-[10px] font-bold text-[#2d5a27] bg-green-50/50 px-2 py-1 rounded border border-green-100">{item.year}</span>}
         </div>
         <h3 onClick={() => { if (item.url && item.url !== 'N/A') openSource(item.url); stealthShorten(item); }} className={`font-serif font-bold text-lg leading-snug mb-2 ${item.url && item.url !== 'N/A' ? 'text-[#2d5a27] hover:underline cursor-pointer' : 'text-slate-800'}`}>{truncateTitle(item.title)}</h3>
         <p className="text-sm text-slate-600 mb-3 italic font-serif border-l-2 border-[#2d5a27]/30 pl-3">{item.journal}</p>
         <p className="text-lg text-slate-500 line-clamp-1 flex items-center gap-1 font-medium"><User size={12} className="text-slate-300" /> {item.author}</p>
       </div>
       <button onClick={() => toggleSave(item)} className={`p-3 rounded-full flex-shrink-0 transition-all duration-200 ${savedItems.some(i => i.id === item.id) ? 'bg-orange-50 text-orange-600 shadow-inner' : 'bg-slate-50 text-slate-300 hover:bg-slate-100 hover:text-slate-500'}`}>
         {savedItems.some(i => i.id === item.id) ? <Leaf size={20} fill="currentColor" /> : <Save size={20} />}
       </button>
     </div>
     <div className="mt-5 pt-4 border-t border-black/5 flex items-center justify-between">
       <button onClick={() => { if (item.url && item.url !== 'N/A') openSource(item.url); stealthShorten(item); }} className="text-xs font-bold text-[#2d5a27] flex items-center gap-1 hover:underline decoration-2 underline-offset-2">Read Source <ExternalLink size={12} /></button>
       <div className="flex gap-2">
         {isSavedView && (
           <>
             <button onClick={() => handleUpdateItem(item)} className={iconBtn} title="Auto Update via DOI">{updatingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}</button>
             <button onClick={() => openEditModal(item)} className={iconBtn} title="Manual Edit"><Edit2 size={16} /></button>
             <button onClick={() => activeQR && activeQR.item.id === item.id ? setActiveQR(null) : handleGenerateQR(item)} className={`p-2 rounded-lg transition-colors ${activeQR && activeQR.item.id === item.id ? 'bg-[#2d5a27] text-white' : 'text-slate-400 hover:text-[#2d5a27] hover:bg-green-50'}`} title="Generate QR Code"><QrCode size={16} /></button>
           </>
         )}
         <button onClick={() => handleShareText(generateStyledCitation(item, 'APA'), "Citation")} className={iconBtn} title="Share Citation"><Quote size={16} /></button>
         <button onClick={() => handleShareText(encodeAcorn(item), "ACORN Code")} className={iconBtn} title="Copy ACORN Code"><FileText size={16} /></button>
         {isSavedView && (
           <button onClick={() => setActivePalette(activePalette === item.id ? null : item.id)} className={iconBtn} title="Change Color"><Palette size={16} /></button>
         )}
       </div>
     </div>
     {isSavedView && activeQR && activeQR.item.id === item.id && (
       <div className="mt-4 pt-4 border-t border-dashed border-slate-200 flex flex-col items-center animate-in slide-in-from-top-2">
         <div className="p-6 rounded-3xl border-2 border-[#bbf7d0] bg-white w-full max-w-[360px] flex flex-col items-center relative shadow-sm">
            <button onClick={() => setActiveQR(null)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 p-1.5 rounded-full"><X size={18}/></button>
            <h3 className="font-bold text-[#2d5a27] font-serif text-2xl mb-3 tracking-wide drop-shadow-sm">🐿️ LitForage</h3>
            <div className="bg-white p-2 rounded-xl shadow-inner border border-slate-100 mb-4">
                <img src={activeQR.url} alt="QR Code" className="w-[300px] h-[300px] object-contain mix-blend-multiply" />
            </div>
            <p className="text-xs text-slate-600 font-bold text-center line-clamp-2 w-full px-2 mb-4 leading-relaxed">
              {item.author ? item.author.split(';')[0].split(',')[0].trim().replace(/[^a-zA-Z]/g, '') : 'Unknown'}, {item.year || 'n.d.'}<br/>
              <span className="font-medium opacity-80">{item.title ? (item.title.length > 25 ? item.title.substring(0, 25) + '...' : item.title) : 'Unknown'}</span>
            </p>
            <button disabled={isGeneratingQR} onClick={downloadBrandedQR} className="w-full bg-[#2d5a27] text-white py-3.5 rounded-xl font-bold hover:bg-[#1a3817] flex items-center justify-center gap-2 text-[15px] disabled:opacity-50 shadow-md transition-all active:scale-[0.98]">
              {isGeneratingQR ? <Loader2 size={18} className="animate-spin" /> : <Download size={18}/>}
              {isGeneratingQR ? "Generating HD Image..." : "Save / Share QR"}
            </button>
         </div>
       </div>
     )}
   </div>
 );

 return (
   <div className="min-h-screen bg-[#fcfaf8] font-sans text-slate-800 pb-20 selection:bg-[#2d5a27]/20 flex justify-center">
     <div className="w-full max-w-md bg-white min-h-screen shadow-2xl relative border-x border-slate-100 flex flex-col">
       <header className="sticky top-0 z-50 bg-[#2d5a27]/95 backdrop-blur-md text-white shadow-lg transition-all">
         <div className="px-4 py-3 flex items-center justify-between">
           <div className="flex items-center gap-3"><span className="text-2xl filter drop-shadow-sm">🐿️</span><h1 className="text-xl font-serif font-bold tracking-wide text-green-50">LitForage</h1></div>
           <button onClick={() => setShowAbout(true)} className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"><Info size={20} /></button>
         </div>
         <div className="flex bg-black/10 backdrop-blur-sm border-t border-white/10">
           <button onClick={() => { setActiveTab('search'); setShowAbout(false); window.scrollTo(0,0); }} className={`flex-1 py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'search' && !showAbout ? 'bg-white text-[#2d5a27] shadow-inner' : 'text-green-100 hover:bg-white/5'}`}><Search size={14} /> Forage</button>
           <button onClick={() => { setActiveTab('saved'); setShowAbout(false); window.scrollTo(0,0); }} className={`flex-1 py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'saved' && !showAbout ? 'bg-white text-[#2d5a27] shadow-inner' : 'text-green-100 hover:bg-white/5'}`}><Leaf size={14} /> {activeSack ? activeSack.name : 'Sack'} ({savedItems.length})</button>
         </div>
       </header>

       {isImporting && (
         <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 bg-[#2d5a27]/90 backdrop-blur-md animate-in fade-in">
             <Loader2 size={48} className="text-white animate-spin mb-6" />
             <h2 className="text-2xl font-serif font-bold text-white mb-2 text-center">Foraging massive harvest... 🌰</h2>
             <p className="text-sm text-green-100 text-center max-w-xs leading-relaxed">Sorting citations into sacks. This may take a few seconds. Please do not close the app.</p>
         </div>
       )}

       {showAbout && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#2d5a27]/80 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
             <div className="bg-[#1a3817] px-6 py-4 flex justify-between items-center text-white">
               <h2 className="font-serif font-bold text-xl flex items-center gap-2">About</h2>
               <button onClick={() => setShowAbout(false)} className="text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10"><X size={20} /></button>
             </div>
             <div className="p-8 text-center">
               <CritterLogo />
               <p className="text-slate-600 text-base font-serif mb-6 leading-relaxed text-left"><strong>LitForage</strong> is your academic critter companion. It helps you find, filter, and gather open-access research papers from across the web.</p>
               <a href="https://www.buymeacoffee.com/LitForage" target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-slate-900 font-bold py-4 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200 shadow-md mb-8"><Coffee size={18} /> Buy this critter a coffee</a>
               <div className="border-t border-slate-100 pt-6 text-center"><p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Created by Chayne Wild</p><p className="text-[10px] text-slate-300 font-mono">v1.0.0 • Powered by Crossref, OpenAlex, DOAJ, Semantic Scholar</p></div>
             </div>
           </div>
         </div>
       )}

       {isScanning && (
         <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white p-4 rounded-3xl shadow-2xl flex flex-col items-center gap-4 w-full max-w-sm">
             <h3 className="font-bold text-slate-800 font-serif text-lg flex items-center gap-2"><ScanLine className="text-purple-600" /> Scan QR / Barcode</h3>
             <div id="reader" className="w-full overflow-hidden rounded-2xl border-4 border-slate-100 bg-black min-h-[250px]"></div>
             <button onClick={() => setIsScanning(false)} className="bg-slate-200 text-slate-700 px-8 py-3.5 rounded-xl font-bold hover:bg-slate-300 transition-all w-full flex items-center justify-center gap-2"><X size={18}/> Cancel Scan</button>
           </div>
         </div>
       )}

       {renameTarget && (
          <SharedModal title="Rename Sack" subtitle="Max 8 characters. Alphanumeric only." onCancel={() => setRenameTarget(null)} onSubmit={handleRenameSackSubmit} submitText={<><Save size={16}/> Update</>} submitColor="bg-[#2d5a27] hover:bg-[#1a3817]" submitDisabled={!renameInput.trim()}>
             <input type="text" maxLength={8} value={renameInput} onChange={e => setRenameInput(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl p-4 mb-5 focus:border-[#2d5a27] focus:ring-4 focus:ring-[#2d5a27]/10 outline-none text-center font-bold text-xl tracking-widest uppercase transition-all" placeholder="NAME" autoFocus />
          </SharedModal>
       )}

       {deleteTarget && (
          <SharedModal title={`Delete ${deleteTarget.name}?`} subtitle={<>This will permanently remove <strong>{deleteTarget.filename}</strong> from your device. This cannot be undone.</>} icon={<AlertCircle size={28} className="text-red-500" />} iconColor="bg-red-50" onCancel={() => setDeleteTarget(null)} onSubmit={(e) => { e.preventDefault(); confirmDeleteSack(); }} submitText="Delete" submitColor="bg-red-500 hover:bg-red-600" />
       )}

       {showClearConfirm && (
          <SharedModal title={`Empty ${activeSack?.name}?`} subtitle="Permanently delete these acorns? This can not be undone." icon={<AlertCircle size={28} className="text-red-500" />} iconColor="bg-red-50" onCancel={() => setShowClearConfirm(false)} onSubmit={async (e) => { e.preventDefault(); if(isWriting) return; setIsWriting(true); try { await updateActiveSackData([]); showNotify("Sack Emptied. Autosaved."); } finally { setIsWriting(false); setShowClearConfirm(false); } }} submitText="Yes, Clear It" submitColor="bg-red-500 hover:bg-red-600" />
       )}

       {showTextExportModal && (
          <SharedModal title="Export Bibliography" subtitle="Choose your citation style. The output will be alphabetized (A-Z) by author." icon={<FileText size={28} className="text-[#2d5a27]" />} iconColor="bg-green-50" onCancel={() => setShowTextExportModal(false)} onSubmit={(e) => {
              e.preventDefault();
              const sorted = sortAcorns(savedItems);
              const content = sorted.map(item => generateStyledCitation(item, textExportStyle)).join('\n\n');
              handleShareFile(content, `LitForage_Bibliography_${textExportStyle}_${getTimestamp()}.txt`);
              setShowTextExportModal(false);
          }} submitText="Export TEXT" submitColor="bg-[#2d5a27] hover:bg-[#1a3817]">
              <div className="space-y-2 mb-2">
                  {['APA', 'MLA', 'Chicago', 'Harvard'].map((style) => (
                      <label key={style} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                          <input type="radio" name="citationStyle" value={style} checked={textExportStyle === style} onChange={(e) => setTextExportStyle(e.target.value)} className="w-4 h-4 text-[#2d5a27] focus:ring-[#2d5a27]" />
                          <span className="font-bold text-slate-700">{style} Format</span>
                      </label>
                  ))}
              </div>
          </SharedModal>
       )}

       {showLoadLocal && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 animate-in fade-in">
             <div className="w-full max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
                 <header className="sticky top-0 z-10 bg-[#2d5a27] text-white shadow-md">
                     <div className="px-5 py-4 flex items-center justify-between">
                         <h1 className="text-2xl font-serif font-bold tracking-wide flex items-center gap-2">My Sacks</h1>
                         <button onClick={() => setShowLoadLocal(false)} className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
                             <X size={24} />
                         </button>
                     </div>
                 </header>
                 <main className="p-4 space-y-4 flex-1 overflow-y-auto bg-[#fcfaf8]">
                     <button onClick={async () => { await createNewSack(); setShowLoadLocal(false); }} className="w-full py-4 border-2 border-dashed border-slate-300 text-slate-500 rounded-2xl font-bold flex items-center justify-center gap-2 hover:border-[#2d5a27] hover:text-[#2d5a27] transition-colors mb-2 bg-slate-50 hover:bg-green-50/50">
                         <PlusCircle size={20} /> Open New Sack
                     </button>
                     {localSacks.length === 0 ? (
                         <div className="text-center py-10 opacity-60">
                             <FolderOpen size={48} className="mx-auto text-slate-300 mb-3" strokeWidth={1.5} />
                             <p className="text-sm font-bold text-slate-500">No local sacks found.</p>
                             <p className="text-xs text-slate-400 mt-1">Open a new sack to begin.</p>
                         </div>
                     ) : (
                         localSacks.map((sack, index) => {
                             const isActive = sack.id === activeSackId;
                             return (
                               <div key={sack.id} draggable onDragStart={(e) => handleDragStart(e, index)} onDragEnter={(e) => handleDragEnter(e, index)} onDragOver={handleDragOver} onDragEnd={handleDragEnd} className={`flex items-center justify-between p-4 rounded-2xl cursor-grab transition-all duration-200 group ${sack.color} border shadow-md hover:-translate-y-0.5 hover:shadow-lg ${isActive ? 'border-slate-800 ring-4 ring-black/5 scale-[1.02] z-10' : 'border-transparent'}`}>
                                   <div className="flex-1 min-w-0 pr-4 flex items-center gap-2">
                                       <div className="opacity-40"><GripVertical size={20}/></div>
                                       <div className="min-w-0">
                                           <h3 onClick={(e) => openRenameSack(e, sack)} className="font-bold tracking-wide uppercase text-2xl truncate leading-tight cursor-pointer hover:underline decoration-black/30 decoration-2 underline-offset-4" title="Click to rename">
                                               {sack.name}
                                           </h3>
                                           <div className="flex items-center gap-2 mt-1">
                                               <span className="text-sm font-bold opacity-80 mix-blend-color-burn">{sack.acorns.length} acorns {isActive && '• Active'}</span>
                                           </div>
                                       </div>
                                   </div>
                                   <div className="flex items-center gap-1.5">
                                       <button disabled={isActive} onClick={(e) => { e.stopPropagation(); setActiveSackId(sack.id); localStorage.setItem('litforage_active_sack', sack.id); setShowLoadLocal(false); showNotify(`Opened ${sack.name}`); }} className={`p-3 rounded-xl transition-colors shrink-0 ${isActive ? 'bg-black/20 opacity-50 cursor-not-allowed' : 'bg-black/5 hover:bg-black/15'}`} title="Open Sack">
                                           <FileOutput size={22} className="opacity-90" />
                                       </button>
                                       <button onClick={(e) => handleDownloadSack(e, sack)} className={actBtn} title="Download / Export">
                                           <Download size={22} className="opacity-90" />
                                       </button>
                                       <button onClick={(e) => handleDeleteSackClick(e, sack)} className="p-3 bg-black/5 hover:bg-red-500 hover:text-white rounded-xl transition-colors shrink-0" title="Delete permanently">
                                           <Trash2 size={22} className="opacity-90" />
                                       </button>
                                   </div>
                               </div>
                             );
                         })
                     )}
                 </main>
             </div>
          </div>
       )}

       {isEditModalOpen && (
           <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]">
                  <div className="bg-[#2d5a27] px-6 py-4 flex justify-between items-center text-white shrink-0">
                      <h3 className="font-serif font-bold text-xl flex items-center gap-2"><FileEdit size={20}/> {editForm.id?.startsWith('manual') ? 'Create Acorn' : 'Edit Acorn'}</h3>
                      <button onClick={() => setIsEditModalOpen(false)} className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
                  </div>
                  <div className="p-5 overflow-y-auto flex-1 bg-slate-50 space-y-4">
                      <form id="edit-form" onSubmit={handleSaveEdit} className="space-y-3">
                          {editForm.id?.startsWith('manual') && (
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-2">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Smart Pre-fill</span>
                                  <div className="flex gap-2">
                                      <input type="text" value={smartInput} onChange={(e) => setSmartInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSmartPrefill(e); } }} placeholder="Paste DOI, ISBN, or raw Acorn..." className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#2d5a27] outline-none" />
                                      <button type="button" onClick={handleSmartPrefill} disabled={smartLoading || !smartInput} className="bg-[#2d5a27] text-white px-3 rounded-lg font-bold hover:bg-[#1a3817] disabled:opacity-50 transition-colors flex items-center justify-center">
                                          {smartLoading ? <span className="text-sm leading-none animate-spin inline-block">🌰</span> : <span className="text-sm leading-none hover:scale-110 transition-transform inline-block">🌰</span>}
                                      </button>
                                  </div>
                              </div>
                          )}
                          <InputRow required label="Title" val={editForm.title || ''} onChange={e => setEditForm({...editForm, title: e.target.value})} placeholder="Acorn Title" />
                          <InputRow label="Author(s)" val={editForm.author || ''} onChange={e => setEditForm({...editForm, author: e.target.value})} placeholder="Last, First; Last, First" />
                          <div className="flex gap-3">
                              <div className="flex-[2]"><InputRow label="Journal / Publisher" val={editForm.journal || ''} onChange={e => setEditForm({...editForm, journal: e.target.value})} placeholder="Source Name" /></div>
                              <div className="flex-1"><InputRow label="Year" val={editForm.year || ''} onChange={e => setEditForm({...editForm, year: e.target.value})} placeholder="YYYY" /></div>
                          </div>
                          <div className="flex gap-3">
                              <div className="flex-1"><InputRow label="DOI / ISBN" val={editForm.doi === 'N/A' ? '' : editForm.doi} onChange={e => setEditForm({...editForm, doi: e.target.value || 'N/A'})} placeholder="10.xxxx/..." /></div>
                              <div className="flex-1"><InputRow label="URL" val={editForm.url === 'N/A' ? '' : editForm.url} onChange={e => setEditForm({...editForm, url: e.target.value || 'N/A'})} placeholder="https://..." /></div>
                          </div>
                          <div className="flex items-center pt-2">
                              <button type="button" onClick={() => setEditForm({...editForm, isBook: !editForm.isBook})} className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#2d5a27] transition-colors">
                                  {editForm.isBook ? <CheckSquare size={18} className="text-[#2d5a27]"/> : <Square size={18}/>}
                                  Book?
                              </button>
                          </div>
                      </form>

                      <div className="mt-6 pt-4 border-t border-slate-200">
                          <button type="button" onClick={() => setShowSackDropdown(!showSackDropdown)} className="flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-[#2d5a27] transition-colors w-full text-left uppercase tracking-wider mb-3">
                              <FolderOpen size={14} /> {showSackDropdown ? 'Hide Offline Sacks' : 'Copy directly to Offline Sack...'}
                          </button>
                          {showSackDropdown && (
                              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                                  {localSacks.length === 0 ? (
                                      <p className="text-xs text-slate-400 italic">No offline sacks available.</p>
                                  ) : localSacks.map(sack => {
                                      const isFull = sack.count >= 100;
                                      return (
                                          <button key={sack.id} type="button" disabled={isFull || isWriting} onClick={() => { handleCopyToOfflineSack(sack); setShowSackDropdown(false); }} className={`w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white transition-all text-left ${(isFull || isWriting) ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#2d5a27] hover:shadow-sm'}`}>
                                              <div className="flex items-center gap-3 truncate">
                                                  <div className={`w-8 h-8 rounded-full ${sack.color} border border-black/5 flex items-center justify-center shrink-0`}>
                                                      <FolderOpen size={14} className="opacity-70 mix-blend-multiply" />
                                                  </div>
                                                  <div className="truncate">
                                                      <span className="font-bold text-slate-700 text-sm block truncate">{sack.name}</span>
                                                  </div>
                                              </div>
                                              <div className="shrink-0 text-right">
                                                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${isFull ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                                      {isFull ? 'FULL' : `${sack.count}/100`}
                                                  </span>
                                              </div>
                                          </button>
                                      );
                                  })}
                              </div>
                          )}
                      </div>
                  </div>
                  <div className="p-4 bg-white border-t border-slate-100 shrink-0 flex gap-3">
                      <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3.5 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors rounded-xl">Cancel</button>
                      <button type="submit" form="edit-form" className="flex-1 py-3.5 text-sm font-bold text-white bg-[#2d5a27] hover:bg-[#1a3817] transition-colors rounded-xl shadow-md flex justify-center items-center gap-2">
                          <Save size={16} /> Save to Workspace
                      </button>
                  </div>
              </div>
           </div>
       )}

       <input type="file" accept=".csv,.ris,.bib,.json,.acorn,.txt,text/csv,text/plain,application/json" ref={fileInputRef} onChange={handleImportFile} style={{ display: 'none' }} />

       <main className="px-4 pt-6 flex-1 overflow-y-auto">
         {notification && <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-slate-800/90 backdrop-blur text-white px-5 py-2.5 rounded-full text-sm shadow-xl flex items-center gap-2 z-[150] animate-fade-in-down border border-white/10"><CheckCircle size={16} className="text-green-400" /> {notification}</div>}

         {activeTab === 'search' && (
           <>
             <form onSubmit={handleSearchSubmit} className="mb-8">
               <div className="relative z-10 group">
                 <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Topic or Keywords..." className="w-full px-4 py-4 rounded-xl bg-white shadow-sm border border-slate-200 focus:ring-2 focus:ring-[#2d5a27] focus:border-transparent outline-none transition-all placeholder:text-slate-400 font-medium text-lg" />
               </div>
               <div className="mt-3">
                 <button type="button" onClick={() => setShowFilters(!showFilters)} className={`text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors ${showFilters ? 'text-[#2d5a27]' : 'text-slate-400 hover:text-[#2d5a27]'}`}><Filter size={12} /> {showFilters ? 'Hide Advanced' : 'Advanced Options'}</button>
                 {showFilters && (
                   <div className="mt-4 bg-white p-5 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-100 animate-in slide-in-from-top-2 space-y-5">
                     <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                         <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Database size={10}/> Forage Engine</span>
                         <div className="relative"><select value={apiSource} onChange={(e) => setApiSource(e.target.value)} className="w-full p-2.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-700 outline-none focus:ring-1 focus:ring-[#2d5a27]"><option value="crossref">Crossref (Default - Best for DOI)</option><option value="openalex">OpenAlex (Global)</option><option value="doaj">DOAJ (Humanities)</option><option value="semanticscholar">Semantic Scholar (AI)</option></select></div>
                     </div>
                     <div className="grid grid-cols-1 gap-5">
                       <div><label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2"><User size={12} /> Specific Author</label><input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g. Butler, J" className="w-full p-2.5 text-sm bg-slate-50 border-0 rounded-lg focus:ring-1 focus:ring-[#2d5a27] outline-none transition-all" /></div>
                       <div><label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2"><Calendar size={12} /> Year Range</label><div className="flex items-center gap-2"><input type="number" value={startYear} onChange={(e) => setStartYear(e.target.value)} placeholder="Start" className="w-full p-2.5 text-sm bg-slate-50 border-0 rounded-lg focus:ring-1 focus:ring-[#2d5a27] outline-none transition-all" /><span className="text-slate-300 font-serif italic">to</span><input type="number" value={endYear} onChange={(e) => setEndYear(e.target.value)} placeholder="End" className="w-full p-2.5 text-sm bg-slate-50 border-0 rounded-lg focus:ring-1 focus:ring-[#2d5a27] outline-none transition-all" /></div></div>
                     </div>
                     <div><label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2"><MinusCircle size={12} /> Must Exclude</label><input type="text" value={exclude} onChange={(e) => setExclude(e.target.value)} placeholder="e.g. biology, physics" className="w-full p-2.5 text-sm bg-red-50/50 border-0 rounded-lg focus:ring-1 focus:ring-red-300 outline-none text-red-800 placeholder:text-red-300 transition-all" /></div>
                     <div className="flex gap-4 pt-3 border-t border-slate-100">
                       <div className="flex-1"><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Resource Type</label><select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full p-2.5 text-sm bg-slate-50 border-0 rounded-lg focus:ring-1 focus:ring-[#2d5a27] outline-none"><option value="any">Any Resource</option><option value="journal-article">Articles</option><option value="book">Books</option><option value="book-chapter">Chapters</option><option value="dissertation">Dissertations</option></select></div>
                       <div className="flex flex-col justify-end pb-1.5" onClick={() => setOaOnly(!oaOnly)}><label className="flex items-center gap-2 cursor-pointer group pointer-events-none"><div className={`w-11 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${oaOnly ? 'bg-[#2d5a27]' : 'bg-slate-200'}`}><div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${oaOnly ? 'translate-x-5' : ''}`}></div></div><span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${oaOnly ? 'text-[#2d5a27]' : 'text-slate-400'}`}>Open Access</span></label></div>
                     </div>
                   </div>
                 )}
               </div>

               <button type="submit" disabled={loading || (!query && !author)} className="w-full mt-6 bg-gradient-to-br from-[#2d5a27] to-[#1e3e1b] text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-green-900/20 hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-3">
                 {loading ? <span className="animate-spin inline-block text-xl">🐿️</span> : 'Forage'}
               </button>

               <button type="button" onClick={() => ScholarBrowser.open({ query: query })} className="w-full mt-3 bg-blue-400 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-blue-900/20 hover:shadow-xl hover:bg-blue-500 hover:scale-[1.01] active:scale-[0.98] transition-all flex justify-center items-center gap-3">
                 Browse
               </button>
             </form>

             <div ref={resultsRef}>
               {!loading && results.length === 0 && !error && (
                 <div className="text-center py-12 opacity-60"><BookOpen size={56} className="mx-auto mb-4 text-slate-300" strokeWidth={1.5} /><p className="text-base text-slate-500 font-serif">The forest is quiet... <br/><span className="text-xs font-sans text-slate-400 mt-2 block">Enter keywords to begin your search.</span></p></div>
               )}
               {error && <div className="bg-red-50 border border-red-100 text-red-600 p-5 rounded-xl flex items-start gap-4 text-sm mb-6 shadow-sm"><AlertCircle size={20} className="flex-shrink-0 mt-0.5" /><div><span className="font-bold block mb-1 text-base">Foraging Error</span>{error}</div></div>}
               <div className="space-y-1">
                 {results.map(item => <AcornCard key={item.id} item={item} isSavedView={false} />)}
               </div>
               {results.length > 0 && <div className="mt-8 pb-8 text-center"><button onClick={() => runForage(true)} disabled={loadingMore} className="w-full py-4 bg-white border-0 ring-1 ring-slate-200 text-slate-600 font-bold rounded-xl shadow-sm hover:shadow-md hover:ring-[#2d5a27]/30 hover:text-[#2d5a27] transition-all flex items-center justify-center gap-2">{loadingMore ? <Loader2 className="animate-spin" size={20} /> : <><ArrowDownCircle size={20} /> Forage Deeper</>}</button><p className="text-xs text-slate-400 mt-2 italic">Critter is ready...</p></div>}
             </div>
           </>
         )}

         {activeTab === 'saved' && (
           <div>
             {savedItems.length === 0 ? (
               <div className="text-center py-20 opacity-60 animate-in fade-in">
                 <div className="bg-stone-200 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner"><Leaf size={36} className="text-[#2d5a27] opacity-50" /></div>
                 <h3 className="font-serif font-bold text-xl text-slate-700">{activeSack ? activeSack.name : 'Workspace'} is Empty</h3>
                 <p className="text-sm text-slate-500 mt-2 mb-6 max-w-xs mx-auto">Import files or load from your device sacks.</p>
                 <div className="flex justify-center gap-2 flex-wrap">
                   <button onClick={() => fileInputRef.current.click()} className={`text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 hover:text-[#2d5a27] ${btnBase}`}><Upload size={14} /> Import</button>
                   <button onClick={() => setIsScanning(true)} className={`text-white bg-purple-600 hover:bg-purple-700 ${btnBase}`}><ScanLine size={14} /> Scan</button>
                   <button onClick={() => setShowLoadLocal(true)} className={`text-white bg-blue-600 hover:bg-blue-700 ${btnBase}`}><FolderOpen size={14} /> Sacks</button>
                   <button onClick={openCreateModal} className={`text-white bg-[#2d5a27] hover:bg-[#1a3817] ${btnBase}`}><PlusCircle size={14} /> Create</button>
                 </div>
                 <p className="text-[10px] text-slate-400 mt-4 font-medium">Compatible with CSV, RIS, BIB, JSON, ACORN & QR</p>
               </div>
             ) : (
               <>
                 <div className="flex justify-between items-center mb-6 px-1 mt-2">
                   <div className="flex gap-2">
                     <button onClick={() => fileInputRef.current.click()} className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors text-slate-500 hover:text-[#2d5a27]"><Upload size={24} /></button>
                     <button onClick={() => setIsScanning(true)} className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors text-purple-600"><ScanLine size={24} /></button>
                     <button onClick={() => setShowLoadLocal(true)} className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors text-blue-600"><FolderOpen size={24} /></button>
                     <button onClick={openCreateModal} className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors text-emerald-600"><PlusCircle size={24} /></button>
                   </div>
                   <button onClick={() => setIsAlphabetized(!isAlphabetized)} className="text-sm font-bold text-slate-500 hover:text-[#2d5a27] transition-colors flex items-center gap-2 bg-white px-4 py-3 rounded-xl shadow-sm border border-slate-200">
                     {isAlphabetized ? <><ArrowDownAZ size={20}/> A-Z</> : <><Clock size={20}/> Newest</>}
                   </button>
                 </div>

                 <div className="space-y-4" ref={resultsRef}>
                   {displayedItems.map(item => <AcornCard key={item.id} item={item} isSavedView={true} />)}
                 </div>

                 <div className="mt-8 pt-6 border-t border-slate-200 pb-12">
                     <div className="flex flex-col gap-4">
                       <div className="flex justify-between items-center px-1">
                         <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Export {activeSack?.name}</span>
                       </div>
                       <div className="grid grid-cols-3 gap-2 animate-in fade-in">
                          <button onClick={() => handleExport('CSV')} className={exportBtn}>CSV</button>
                          <button onClick={() => handleExport('JSON')} className={exportBtn}>JSON</button>
                          <button onClick={() => handleExport('BIB')} className={exportBtn}>BIB</button>
                          <button onClick={() => handleExport('RIS')} className={exportBtn}>RIS</button>
                          <button onClick={() => handleExport('ACORN')} className={exportBtn}>ACORN</button>
                          <div className="flex flex-col relative group">
                              <button onClick={() => handleExport('TEXT')} className={exportBtn}>TEXT</button>
                              <span className="text-[8px] text-center text-slate-400 mt-0.5 whitespace-nowrap absolute -bottom-3 w-full">not import compatible</span>
                          </div>
                       </div>

                       <div className="mt-4 flex gap-2">
                          <button onClick={() => setShowLoadLocal(true)} className="flex-1 bg-blue-50 text-blue-600 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-colors shadow-sm">
                              My Sacks
                          </button>
                          <button onClick={() => setShowClearConfirm(true)} className="flex-1 text-sm font-bold text-slate-500 bg-slate-50 py-3 border border-slate-200 rounded-xl hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors inline-flex justify-center items-center gap-1.5 shadow-sm">
                              <Trash2 size={16} /> Empty Sack
                          </button>
                       </div>
                     </div>
                 </div>

               </>
             )}
           </div>
         )}
       </main>
     </div>
   </div>
 );
}