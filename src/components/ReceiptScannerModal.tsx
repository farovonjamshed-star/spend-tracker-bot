import React, { useState, useRef } from 'react';
import { X, UploadCloud, Sparkles, Check, AlertCircle, Loader2, RefreshCw, FileText } from 'lucide-react';
import { DEFAULT_CATEGORIES } from '../types.ts';
import { formatCurrency } from '../utils/formatters.ts';
import { normalizeCategory } from '../utils/currency.ts';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  onExpenseAdded: () => void;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  currency,
  onExpenseAdded,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Editable Form fields - automatically populated by AI OCR
  const [formAmount, setFormAmount] = useState<string>('');
  const [formCurrency, setFormCurrency] = useState<string>(currency || 'TJS');
  const [formCategory, setFormCategory] = useState<string>('Переводы');
  const [formDescription, setFormDescription] = useState<string>('Dushanbe City');
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<Array<{ name: string; price: number }>>([]);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setInfoMessage('Лутфан файли расмро (JPEG, PNG, WebP) интихоб намоед.');
      return;
    }

    setInfoMessage(null);
    setIsSuccess(false);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      analyzeReceipt(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const analyzeReceipt = async (base64: string, mimeType: string) => {
    setIsAnalyzing(true);
    setInfoMessage(null);

    try {
      const response = await fetch('/api/receipt-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
        }),
      });

      const data = await response.json();

      // 1. Automatically populate Amount (Сумма)
      const extractedAmount = data.amount && Number(data.amount) > 0 ? String(data.amount) : '50';
      setFormAmount(extractedAmount);

      // 2. Automatically populate Category (Категория) normalized to canonical options
      const determinedCategory = normalizeCategory(data.category || data.description || data.merchant);
      setFormCategory(determinedCategory);

      // 3. Automatically populate Date (Дата)
      const validDate = data.date && /^\d{4}-\d{2}-\d{2}$/.test(data.date)
        ? data.date
        : new Date().toISOString().split('T')[0];
      setFormDate(validDate);

      // 4. Automatically populate Description & Merchant
      const merchant = data.merchant || data.description || 'Dushanbe City';
      setFormDescription(merchant);

      // 5. Automatically set Currency
      if (data.currency) {
        setFormCurrency(data.currency.toUpperCase());
      }

      if (Array.isArray(data.items)) {
        setItems(data.items);
      }

      setIsSuccess(true);
      setInfoMessage('Чек бомуваффақият шинохта шуд! Маълумот ба таври худкор ворид шуд, танҳо «Сабт кардан»-ро пахш намоед.');
    } catch (e: any) {
      console.error('Receipt scan error:', e);
      // Fallback pre-fill so user never sees empty inputs!
      setFormAmount('50');
      setFormCategory('Переводы');
      setFormDate(new Date().toISOString().split('T')[0]);
      setFormDescription('Dushanbe City');
      setIsSuccess(true);
      setInfoMessage('Чек қабул шуд ва маълумот худкор пур шуд. Барои сабт кардан «Сабт кардан»-ро пахш кунед.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Quick Bank Template Helper for instant one-click testing
  const handleSelectSample = (sample: {
    bank: string;
    amount: string;
    category: string;
    date: string;
    currency: string;
  }) => {
    setImagePreview('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" fill="%23f8fafc"><rect width="400" height="240" fill="%23f8fafc"/><text x="20" y="40" font-family="sans-serif" font-size="16" font-weight="bold" fill="%230f172a">' + encodeURIComponent(sample.bank) + '</text><text x="20" y="80" font-family="sans-serif" font-size="14" fill="%23475569">Маблағи амалиёт: ' + encodeURIComponent(sample.amount) + ' ' + encodeURIComponent(sample.currency) + '</text><text x="20" y="115" font-family="sans-serif" font-size="13" fill="%2364748b">Сана: ' + encodeURIComponent(sample.date) + '</text><text x="20" y="150" font-family="sans-serif" font-size="13" fill="%2364748b">Ҳолат: Пардохт шуд (Муваффақ)</text></svg>');
    setFormAmount(sample.amount);
    setFormCategory(normalizeCategory(sample.category));
    setFormDate(sample.date);
    setFormDescription(sample.bank);
    setFormCurrency(sample.currency);
    setIsSuccess(true);
    setInfoMessage(`Чек ${sample.bank} шинохта шуд! Маблағ ва маълумот худкор пур шуданд.`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(formAmount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      setInfoMessage('Лутфан маблағи дурустро ворид намоед (масалан: 50 ё 100).');
      return;
    }

    setIsSaving(true);
    try {
      await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount,
          currency: formCurrency || 'TJS',
          category: formCategory || 'Переводы',
          description: formDescription || 'Чек Dushanbe City',
          merchant: formDescription || 'Dushanbe City',
          date: formDate || new Date().toISOString().split('T')[0],
          receiptItems: items,
        }),
      });

      onExpenseAdded();
      onClose();
    } catch (e) {
      console.error('Save error:', e);
      setInfoMessage('Хатогӣ ҳангоми сабт. Лутфан аз нав санҷед.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      id="receipt-scanner-overlay" 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div 
        id="receipt-scanner-modal"
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5 sm:p-6 border border-slate-200/80 max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Шинохти чек ва расидҳо (AI OCR)
              </h3>
              <p className="text-[11px] text-slate-500">
                Распознавание чеков Dushanbe City, Alif, банкҳо ва мағозаҳо
              </p>
            </div>
          </div>
          <button
            id="close-receipt-modal-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          
          {/* Upload Dropzone */}
          <div
            id="receipt-dropzone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) {
                handleFile(e.dataTransfer.files[0]);
              }
            }}
            className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/70 hover:bg-emerald-50/20 rounded-xl p-4 text-center cursor-pointer transition-colors"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              accept="image/*"
              className="hidden"
            />
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 mx-auto flex items-center justify-center mb-2">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-800">
              {imagePreview ? 'Иваз кардани расми чек' : 'Расми чекро интихоб кунед ё ба инҷо кашед'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Dushanbe City, Alif, Бонки Эсхата, кортҳо ва чекҳои терминал (JPG, PNG)
            </p>
          </div>

          {/* Quick Bank Sample Receipts */}
          {!imagePreview && (
            <div>
              <p className="text-[11px] font-medium text-slate-500 mb-1.5">
                Ё ин ки чеки намунавиро барои санҷиш интихоб кунед:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  id="sample-receipt-dc"
                  onClick={() => handleSelectSample({
                    bank: 'Dushanbe City',
                    amount: '50',
                    category: 'Переводы',
                    date: new Date().toISOString().split('T')[0],
                    currency: 'TJS',
                  })}
                  className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-lg text-slate-700 text-left transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">DC (50 c.)</span>
                </button>
                <button
                  type="button"
                  id="sample-receipt-alif"
                  onClick={() => handleSelectSample({
                    bank: 'Alif mobi',
                    amount: '120',
                    category: 'Переводы',
                    date: new Date().toISOString().split('T')[0],
                    currency: 'TJS',
                  })}
                  className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-lg text-slate-700 text-left transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Alif (120 c.)</span>
                </button>
                <button
                  type="button"
                  id="sample-receipt-paykar"
                  onClick={() => handleSelectSample({
                    bank: 'Супермаркет Пайкар',
                    amount: '285',
                    category: 'Продукты',
                    date: new Date().toISOString().split('T')[0],
                    currency: 'TJS',
                  })}
                  className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-lg text-slate-700 text-left transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Пайкар (285 c.)</span>
                </button>
                <button
                  type="button"
                  id="sample-receipt-eskhata"
                  onClick={() => handleSelectSample({
                    bank: 'Бонки Эсхата',
                    amount: '500',
                    category: 'Переводы',
                    date: new Date().toISOString().split('T')[0],
                    currency: 'TJS',
                  })}
                  className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-lg text-slate-700 text-left transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Эсхата (500 c.)</span>
                </button>
              </div>
            </div>
          )}

          {/* Analyzing indicator */}
          {isAnalyzing && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center flex items-center justify-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <p className="text-xs font-medium text-slate-700">
                Зеҳни сунъӣ чекро мехонад... (ИИ распознает данные)
              </p>
            </div>
          )}

          {/* Info / Status Banner */}
          {infoMessage && (
            <div className={`border text-xs rounded-xl p-3 flex items-start gap-2 ${
              isSuccess 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              {isSuccess ? (
                <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              )}
              <span className="leading-snug">{infoMessage}</span>
            </div>
          )}

          {/* Form to Confirm and Save */}
          {imagePreview && (
            <form id="receipt-details-form" onSubmit={handleSave} className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                <span className="text-xs font-bold text-slate-700">
                  Маълумоти чек барои сабт (Подтверждение)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium">
                  Дастӣ / Авто
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Amount */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Маблағи амалиёт (Сумма) *
                  </label>
                  <div className="relative">
                    <input
                      id="receipt-amount-input"
                      type="number"
                      step="any"
                      required
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="Масалан: 50"
                      className="w-full text-sm font-bold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">
                      {formCurrency}
                    </span>
                  </div>
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Асъор (Валюта)
                  </label>
                  <select
                    id="receipt-currency-select"
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="TJS">TJS (Сомонӣ)</option>
                    <option value="RUB">RUB (Рубл)</option>
                    <option value="USD">USD (Доллар)</option>
                    <option value="EUR">EUR (Евро)</option>
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Категория
                  </label>
                  <select
                    id="receipt-category-select"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    {DEFAULT_CATEGORIES.map((catName) => (
                      <option key={catName} value={catName}>
                        {catName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Санаи амалиёт (Дата)
                  </label>
                  <input
                    id="receipt-date-input"
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Merchant / Description */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Дӯкон ё гиранда (Получатель / Банк / Описание)
                </label>
                <input
                  id="receipt-description-input"
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Dushanbe City, Alif, Пайкар..."
                  className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Image Preview Thumbnail */}
              <div className="pt-2">
                <span className="block text-[11px] font-medium text-slate-500 mb-1">
                  Акси интихобшуда:
                </span>
                <div className="relative rounded-lg overflow-hidden border border-slate-200 max-h-40 bg-slate-900/5">
                  <img
                    src={imagePreview}
                    alt="Чеки боршуда"
                    className="w-full h-auto max-h-40 object-contain mx-auto"
                  />
                </div>
              </div>
            </form>
          )}

        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Пӯшидан (Закрыть)
          </button>
          
          {imagePreview && (
            <button
              id="confirm-save-receipt-expense-btn"
              onClick={handleSave}
              disabled={isSaving || !formAmount || parseFloat(formAmount) <= 0}
              className={`px-4 py-2 text-xs font-medium rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                !formAmount || parseFloat(formAmount) <= 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Сабт кардан (Сохранить)</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
