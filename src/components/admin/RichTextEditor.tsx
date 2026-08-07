"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Code,
  Eye,
  Edit3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RemoveFormatting,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "İçeriğinizi buraya girin...",
  label,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"visual" | "html" | "preview">("visual");
  const [htmlInput, setHtmlInput] = useState(value);

  // Sync value from parent
  useEffect(() => {
    setHtmlInput(value);
    if (editorRef.current && editorRef.current.innerHTML !== value && viewMode === "visual") {
      editorRef.current.innerHTML = value;
    }
  }, [value, viewMode]);

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      const updated = editorRef.current.innerHTML;
      onChange(updated);
      setHtmlInput(updated);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      const updated = editorRef.current.innerHTML;
      onChange(updated);
      setHtmlInput(updated);
    }
  };

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setHtmlInput(val);
    onChange(val);
  };

  const insertLink = () => {
    const url = prompt("Bağlantı URL'sini girin (örn: https://...):");
    if (url) {
      execCommand("createLink", url);
    }
  };

  const insertImage = () => {
    const url = prompt("Görsel URL'sini girin (örn: https://...):");
    if (url) {
      execCommand("insertImage", url);
    }
  };

  const insertTable = () => {
    const tableHTML = `
      <table border="1" style="width:100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #e2e8f0;">
        <thead>
          <tr style="background-color: #f8fafc;">
            <th style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: left;">Başlık 1</th>
            <th style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: left;">Başlık 2</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Veri 1</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Veri 2</td>
          </tr>
        </tbody>
      </table><p></p>
    `;
    execCommand("insertHTML", tableHTML);
  };

  const insertCallout = () => {
    const calloutHTML = `
      <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px 16px; margin: 16px 0; border-radius: 4px; color: #166534;">
        <strong>Önemli Bilgilendirme:</strong> Buraya açıklamanızı yazın.
      </div><p></p>
    `;
    execCommand("insertHTML", calloutHTML);
  };

  return (
    <div className="w-full flex flex-col gap-2">
      {label && <label className="text-sm font-semibold text-gray-700">{label}</label>}

      <div className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
        {/* Mod Değiştirme Butonları & Araç Çubuğu */}
        <div className="flex flex-wrap items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2 gap-2">
          {/* Sol Araçlar (Görsel mod aktifse göster) */}
          {viewMode === "visual" ? (
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => execCommand("formatBlock", "<h2>")}
                title="Başlık 2 (H2)"
                className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition"
              >
                <Heading1 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => execCommand("formatBlock", "<h3>")}
                title="Başlık 3 (H3)"
                className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition"
              >
                <Heading2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => execCommand("formatBlock", "<h4>")}
                title="Başlık 4 (H4)"
                className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition"
              >
                <Heading3 className="w-4 h-4" />
              </button>

              <div className="h-4 w-[1px] bg-gray-300 mx-1" />

              <button
                type="button"
                onClick={() => execCommand("bold")}
                title="Kalın (Bold)"
                className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => execCommand("italic")}
                title="İtalik (Italic)"
                className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => execCommand("underline")}
                title="Altı Çizili"
                className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition"
              >
                <Underline className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => execCommand("strikeThrough")}
                title="Üstü Çizili"
                className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition"
              >
                <Strikethrough className="w-4 h-4" />
              </button>

              <div className="h-4 w-[1px] bg-gray-300 mx-1" />

              <button
                type="button"
                onClick={() => execCommand("justifyLeft")}
                title="Sola Hizala"
                className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => execCommand("justifyCenter")}
                title="Ortala"
                className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => execCommand("justifyRight")}
                title="Sağa Hizala"
                className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition"
              >
                <AlignRight className="w-4 h-4" />
              </button>

              <div className="h-4 w-[1px] bg-gray-300 mx-1" />

              <button
                type="button"
                onClick={() => execCommand("insertUnorderedList")}
                title="Maddeli Liste"
                className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => execCommand("insertOrderedList")}
                title="Numaralı Liste"
                className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => execCommand("formatBlock", "<blockquote>")}
                title="Alıntı Koyu"
                className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition"
              >
                <Quote className="w-4 h-4" />
              </button>

              <div className="h-4 w-[1px] bg-gray-300 mx-1" />

              <button
                type="button"
                onClick={insertLink}
                title="Bağlantı Ekle"
                className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={insertImage}
                title="Görsel Ekle"
                className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={insertTable}
                title="Tablo Ekle"
                className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={insertCallout}
                title="Vurgu Kutusu Ekle"
                className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded transition"
              >
                + Vurgu Kutusu
              </button>

              <div className="h-4 w-[1px] bg-gray-300 mx-1" />

              <button
                type="button"
                onClick={() => execCommand("removeFormat")}
                title="Biçimlendirmeyi Temizle"
                className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition"
              >
                <RemoveFormatting className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-xs font-semibold text-gray-500">
              {viewMode === "html" ? "HTML Kod Düzenleyici" : "Canlı Önizleme Modu"}
            </div>
          )}

          {/* Sağ Mod Değiştirici */}
          <div className="flex items-center gap-1 bg-gray-200 p-0.5 rounded-md text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode("visual")}
              className={`flex items-center gap-1 px-2 py-1 rounded transition ${
                viewMode === "visual"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Görsel
            </button>
            <button
              type="button"
              onClick={() => setViewMode("html")}
              className={`flex items-center gap-1 px-2 py-1 rounded transition ${
                viewMode === "html"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              HTML
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`flex items-center gap-1 px-2 py-1 rounded transition ${
                viewMode === "preview"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Önizleme
            </button>
          </div>
        </div>

        {/* Görsel Düzenleyici Alanı */}
        {viewMode === "visual" && (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onBlur={handleInput}
            className="min-h-[320px] max-h-[600px] overflow-y-auto p-4 focus:outline-none prose prose-slate max-w-none text-gray-800"
            style={{ minHeight: "320px" }}
            data-placeholder={placeholder}
          />
        )}

        {/* HTML Kod Düzenleyici */}
        {viewMode === "html" && (
          <textarea
            value={htmlInput}
            onChange={handleHtmlChange}
            rows={14}
            className="w-full p-4 font-mono text-sm bg-gray-900 text-gray-100 focus:outline-none"
            placeholder="<html>...</html>"
          />
        )}

        {/* Canlı Önizleme */}
        {viewMode === "preview" && (
          <div
            className="min-h-[320px] p-6 bg-gray-50 border-t prose prose-slate max-w-none text-gray-800"
            dangerouslySetInnerHTML={{ __html: value || "<p className='text-gray-400 italic'>Henüz içerik girilmedi...</p>" }}
          />
        )}
      </div>
    </div>
  );
}
