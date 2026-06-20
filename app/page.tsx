"use client";

import React, { useState, useEffect, useRef } from "react";

export default function ImageOptimizer() {
  const [originalUrl, setOriginalUrl] = useState<string>("");
  const [modifiedUrl, setModifiedUrl] = useState<string>("");
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 });
  const [quality, setQuality] = useState<number>(80);
  const [bitDepth, setBitDepth] = useState<number>(24);
  const [comparePos, setComparePos] = useState<number>(50);
  
  const [sizes, setSizes] = useState({ original: 0, modified: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Manejar la carga de la imagen
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSizes((prev) => ({ ...prev, original: file.size }));
    
    const url = URL.createObjectURL(file);
    setOriginalUrl(url);

    const img = new Image();
    img.onload = () => {
      setDimensions({ width: img.width, height: img.height });
      setOriginalDimensions({ width: img.width, height: img.height });
    };
    img.src = url;
  };

  // Motor de procesamiento (Canvas)
  useEffect(() => {
    if (!originalUrl || dimensions.width === 0 || dimensions.height === 0) return;

    const img = new Image();
    img.onload = () => {
      let canvas = canvasRef.current;
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvasRef.current = canvas;
      }

      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        // Limpiar y dibujar la imagen con las nuevas dimensiones
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // --- Reducción de profundidad de bits ---
        if (bitDepth !== 24) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          if (bitDepth === 1) {
             // 1 bit: Blanco y negro (Thresholding)
             for (let i = 0; i < data.length; i += 4) {
               const avg = (data[i] + data[i+1] + data[i+2]) / 3;
               const val = avg > 127 ? 255 : 0;
               data[i] = val;
               data[i+1] = val;
               data[i+2] = val;
             }
          } else if (bitDepth === 8) {
             // 8 bits: Paleta de 256 colores (3 bits R, 3 bits G, 2 bits B)
             for (let i = 0; i < data.length; i += 4) {
               data[i] = Math.round(data[i] / 36.42) * 36.42;       // 7 steps
               data[i+1] = Math.round(data[i+1] / 36.42) * 36.42;   // 7 steps
               data[i+2] = Math.round(data[i+2] / 85) * 85;         // 3 steps
             }
          }
          ctx.putImageData(imageData, 0, 0);
        }
        
        // Comprimir y generar blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              setModifiedUrl(URL.createObjectURL(blob));
              setSizes((prev) => ({ ...prev, modified: blob.size }));
            }
          },
          "image/jpeg",
          quality / 100
        );
      }
    };
    img.src = originalUrl;
  }, [originalUrl, dimensions, quality, bitDepth]);

  // Utilidad para formatear bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            Image Optimizer & Comparator
          </h1>
          <p className="text-gray-400 mt-2">Carga, redimensiona, comprime y compara.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* PANEL DE CONTROL */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-6 shadow-xl h-fit">
            <div>
              <label className="block text-sm font-medium mb-2">Cargar Imagen</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-colors"
              />
            </div>

            {originalUrl && (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="flex justify-between text-sm mb-1">
                      <span>Resolución (Muestreo)</span>
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <button onClick={() => setDimensions({ width: originalDimensions.width, height: originalDimensions.height })} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">Original</button>
                      <button onClick={() => setDimensions({ width: 100, height: 100 })} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">100x100</button>
                      <button onClick={() => setDimensions({ width: 500, height: 500 })} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">500x500</button>
                      <button onClick={() => setDimensions({ width: 1000, height: 1000 })} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">1000x1000</button>
                    </div>
                  </div>

                  <div>
                    <label className="flex justify-between text-sm mb-1">
                      <span>Ancho (px)</span>
                      <span className="text-blue-400">{dimensions.width}</span>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="4000"
                      value={dimensions.width}
                      onChange={(e) => setDimensions({ ...dimensions, width: Number(e.target.value) })}
                      className="w-full accent-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="flex justify-between text-sm mb-1">
                      <span>Alto (px)</span>
                      <span className="text-blue-400">{dimensions.height}</span>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="4000"
                      value={dimensions.height}
                      onChange={(e) => setDimensions({ ...dimensions, height: Number(e.target.value) })}
                      className="w-full accent-blue-500"
                    />
                  </div>

                  <div>
                    <label className="flex justify-between text-sm mb-1">
                      <span>Profundidad de Bits</span>
                    </label>
                    <select
                      value={bitDepth}
                      onChange={(e) => setBitDepth(Number(e.target.value))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-1 px-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={24}>24 bits (True Color)</option>
                      <option value={8}>8 bits (256 Colores)</option>
                      <option value={1}>1 bit (Blanco y Negro)</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex justify-between text-sm mb-1">
                      <span>Calidad JPEG (%)</span>
                      <span className="text-emerald-400">{quality}%</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={quality}
                      onChange={(e) => setQuality(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Original: {formatBytes(sizes.original)}</span>
                    <span className="text-emerald-400 font-bold">
                      Nueva: {formatBytes(sizes.modified)}
                    </span>
                  </div>
                  <a
                    href={modifiedUrl}
                    download={`optimizada-${quality}.jpg`}
                    className="block w-full text-center bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold py-3 px-4 rounded-lg transition-all transform active:scale-95"
                  >
                    Descargar Imagen
                  </a>
                </div>
              </>
            )}
          </div>

          {/* VISUALIZADOR Y COMPARADOR */}
          <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center overflow-hidden min-h-[500px] relative shadow-xl">
            {!originalUrl || !modifiedUrl ? (
              <p className="text-gray-500">Selecciona una imagen para comenzar</p>
            ) : (
              <div className="relative w-full h-full max-h-[70vh] flex items-center justify-center p-4">
                {/* Contenedor del comparador para mantener proporciones */}
                <div className="relative inline-block max-w-full max-h-full">
                  
                  {/* IMAGEN DE FONDO (Modificada) */}
                  <img
                    src={modifiedUrl}
                    alt="Modificada"
                    className="block max-w-full max-h-[60vh] object-contain select-none"
                    draggable={false}
                  />

                  {/* IMAGEN SUPERPUESTA (Original con Clip-Path) */}
                  <img
                    src={originalUrl}
                    alt="Original"
                    className="absolute top-0 left-0 block max-w-full max-h-[60vh] object-contain select-none"
                    style={{ clipPath: `inset(0 ${100 - comparePos}% 0 0)` }}
                    draggable={false}
                  />

                  {/* LÍNEA DIVISORIA */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10 pointer-events-none"
                    style={{ left: `calc(${comparePos}% - 2px)` }}
                  >
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <div className="flex space-x-1">
                        <div className="w-0.5 h-3 bg-gray-400"></div>
                        <div className="w-0.5 h-3 bg-gray-400"></div>
                      </div>
                    </div>
                  </div>

                  {/* SLIDER INVISIBLE (Controlador) */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={comparePos}
                    onChange={(e) => setComparePos(Number(e.target.value))}
                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-ew-resize z-20 m-0"
                  />
                </div>
                
                {/* Etiquetas indicadoras */}
                <div className="absolute top-6 left-6 bg-black/60 text-white px-3 py-1 rounded-md text-sm backdrop-blur-sm pointer-events-none z-30">
                  Original
                </div>
                <div className="absolute top-6 right-6 bg-black/60 text-emerald-400 px-3 py-1 rounded-md text-sm backdrop-blur-sm pointer-events-none z-30">
                  Comprimida
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </main>
  );
}