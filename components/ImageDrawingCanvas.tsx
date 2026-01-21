import React, { useRef, useEffect, useState } from 'react';
import { 
  Pencil, 
  Circle as CircleIcon, 
  Square, 
  MoveRight, 
  Type, 
  Eraser, 
  Undo, 
  Redo,
  Download, 
  Check,
  ClipboardPlus,
  Ruler,
  Highlighter,
  Trash2,
  MousePointer2,
  Minus,
  PaintBucket,
  Palette,
  X,
  ZoomIn,
  ZoomOut,
  Maximize,
  Hand
} from 'lucide-react';

interface ImageDrawingCanvasProps {
  imageFile: File;
  onSave: (dataUrl: string, description: string) => void;
  onCancel: () => void;
}

type Tool = 'pen' | 'highlighter' | 'line' | 'arrow' | 'rect' | 'circle' | 'text' | 'eraser' | 'pan';
type Color = '#EF4444' | '#EAB308' | '#22C55E' | '#3B82F6' | '#FFFFFF' | '#000000' | '#F472B6' | '#9333EA'; 
type LineStyle = 'solid' | 'dashed' | 'dotted';

const ImageDrawingCanvas: React.FC<ImageDrawingCanvasProps> = ({ imageFile, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); // The viewport (scrollable/hidden overflow)
  const textInputRef = useRef<HTMLInputElement>(null);
  
  // Image State
  const [bgImageUrl, setBgImageUrl] = useState<string>('');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Viewport State (Zoom & Pan)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

  // Context & History
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);
  
  // Tools & Properties
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState<Color>('#EF4444'); 
  const [lineWidth, setLineWidth] = useState(3);
  const [opacity, setOpacity] = useState(1);
  const [lineStyle, setLineStyle] = useState<LineStyle>('solid');
  const [isFilled, setIsFilled] = useState(false);
  
  // Drawing Logic
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);
  const [snapshot, setSnapshot] = useState<ImageData | null>(null);
  const [description, setDescription] = useState('');

  // Text Input Overlay State
  const [textInput, setTextInput] = useState<{
    isVisible: boolean;
    x: number;
    y: number;
    value: string;
    rotation?: number;
  }>({ isVisible: false, x: 0, y: 0, value: '' });
  
  // Initialization
  useEffect(() => {
    const url = URL.createObjectURL(imageFile);
    setBgImageUrl(url);

    const img = new Image();
    img.src = url;
    img.onload = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (container && canvas) {
        // Calculate fit dimensions based on natural size initially
        // We set the canvas to the IMAGE'S resolution, but display it fitted via CSS/Zoom logic later if needed
        let w = img.width;
        let h = img.height;
        
        // Initial "Fit to Screen" logic for pan/zoom starting point
        const maxWidth = container.clientWidth - 40;
        const maxHeight = 600;
        const scaleFit = Math.min(maxWidth / w, maxHeight / h);
        
        // Set internal resolution
        setDimensions({ width: w, height: h });
        canvas.width = w;
        canvas.height = h;

        // Set initial zoom to fit (or 1 if image is small)
        if (scaleFit < 1) {
             setZoom(scaleFit);
             // Center image initially
             const offsetX = (container.clientWidth - w * scaleFit) / 2;
             const offsetY = (container.clientHeight - h * scaleFit) / 2;
             setPan({ x: offsetX, y: offsetY });
        } else {
             const offsetX = (container.clientWidth - w) / 2;
             const offsetY = (container.clientHeight - h) / 2;
             setPan({ x: offsetX > 0 ? offsetX : 0, y: offsetY > 0 ? offsetY : 0 });
        }
        
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (context) {
            setCtx(context);
            const emptyData = context.getImageData(0, 0, w, h);
            setHistory([emptyData]);
        }
      }
    };

    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Focus text input when it appears
  useEffect(() => {
    if (textInput.isVisible && textInputRef.current) {
        textInputRef.current.focus();
    }
  }, [textInput.isVisible]);

  // --- ZOOM & PAN LOGIC ---

  const handleZoom = (delta: number) => {
      setZoom(prev => Math.min(Math.max(0.1, prev + delta), 5));
  };

  const handleWheel = (e: React.WheelEvent) => {
      // Allow standard scrolling if ctrl is not held? No, standard in canvas apps is wheel=zoom
      // But let's check if user wants to scroll the page. Usually we prevent default in canvas.
      // Simple implementation: Wheel = Zoom relative to mouse center
      if (e.ctrlKey || e.metaKey || true) { // Always zoom on wheel for this component
         e.preventDefault();
         const scaleAmount = -e.deltaY * 0.001;
         const newZoom = Math.min(Math.max(0.1, zoom + scaleAmount), 5);
         
         // Calculate mouse position relative to container
         const rect = containerRef.current?.getBoundingClientRect();
         if (!rect) return;
         
         const mouseX = e.clientX - rect.left;
         const mouseY = e.clientY - rect.top;

         // Zoom towards mouse:
         // worldX = (mouseX - panX) / oldZoom
         // newPanX = mouseX - worldX * newZoom
         
         const worldX = (mouseX - pan.x) / zoom;
         const worldY = (mouseY - pan.y) / zoom;
         
         const newPanX = mouseX - worldX * newZoom;
         const newPanY = mouseY - worldY * newZoom;

         setZoom(newZoom);
         setPan({ x: newPanX, y: newPanY });
      }
  };

  const resetView = () => {
      if (!containerRef.current || dimensions.width === 0) return;
      const w = dimensions.width;
      const h = dimensions.height;
      const maxWidth = containerRef.current.clientWidth - 40;
      const maxHeight = containerRef.current.clientHeight - 40;
      const scaleFit = Math.min(maxWidth / w, maxHeight / h, 1);
      
      setZoom(scaleFit);
      const offsetX = (containerRef.current.clientWidth - w * scaleFit) / 2;
      const offsetY = (containerRef.current.clientHeight - h * scaleFit) / 2;
      setPan({ x: offsetX, y: offsetY });
  };

  // --- HISTORY MANAGEMENT ---

  const saveState = () => {
    if (!ctx || !canvasRef.current) return;
    const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    setHistory(prev => {
        const newHist = [...prev, imageData];
        if (newHist.length > 20) newHist.shift(); // Max 20 steps
        return newHist;
    });
    setRedoStack([]); // Clear redo on new action
  };

  const handleUndo = () => {
    if (history.length <= 1 || !ctx) return; // Keep initial empty state
    
    const current = history[history.length - 1];
    const previous = history[history.length - 2];
    
    setRedoStack(prev => [current, ...prev]);
    setHistory(prev => prev.slice(0, -1));
    
    ctx.putImageData(previous, 0, 0);
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || !ctx) return;
    
    const next = redoStack[0];
    setRedoStack(prev => prev.slice(1));
    setHistory(prev => [...prev, next]);
    
    ctx.putImageData(next, 0, 0);
  };

  const clearCanvas = () => {
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    saveState();
  };

  // --- DRAWING STYLES ---

  const applyStyles = (context: CanvasRenderingContext2D) => {
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = lineWidth; // Line width is in "World" pixels, so it scales with zoom naturally
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.globalAlpha = opacity;

    // Line Dash
    if (lineStyle === 'dashed') {
        context.setLineDash([lineWidth * 3, lineWidth * 2]);
    } else if (lineStyle === 'dotted') {
        context.setLineDash([lineWidth, lineWidth * 2]);
    } else {
        context.setLineDash([]);
    }

    // Tool overrides
    if (tool === 'highlighter') {
        context.globalAlpha = 0.3; 
        context.lineWidth = 20; 
        context.strokeStyle = color === '#FFFFFF' ? '#FFFF00' : color; 
        context.setLineDash([]);
        context.globalCompositeOperation = 'source-over';
    } else if (tool === 'eraser') {
        context.lineWidth = lineWidth * 4;
        context.globalAlpha = 1;
        context.setLineDash([]);
        // Crucial: Use destination-out to make canvas transparent again
        context.globalCompositeOperation = 'destination-out';
    } else {
        context.globalCompositeOperation = 'source-over';
    }
  };

  // --- MOUSE HANDLERS (Adjusted for Zoom/Pan) ---

  const getPos = (e: React.MouseEvent) => {
     if (!containerRef.current) return { x: 0, y: 0 };
     // We calculate position relative to the transformed coordinate system
     const rect = containerRef.current.getBoundingClientRect();
     
     // Mouse relative to the Viewport Container
     const clientX = e.clientX - rect.left;
     const clientY = e.clientY - rect.top;

     // Convert to Canvas "World" Coordinates
     // (ClientPos - PanOffset) / ZoomScale
     return {
        x: (clientX - pan.x) / zoom,
        y: (clientY - pan.y) / zoom
     };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tool === 'pan' || (e.button === 1)) { // Middle mouse or Pan tool
        setIsPanning(true);
        setLastPanPoint({ x: e.clientX, y: e.clientY });
        return;
    }

    if (!ctx || !canvasRef.current) return;
    const { x, y } = getPos(e);

    // If text input is open, commit it first
    if (textInput.isVisible) {
        commitText();
        return;
    }

    if (tool === 'text') {
        setTextInput({ 
            isVisible: true, 
            x, // World Coordinates
            y, 
            value: '' 
        });
        return;
    }

    setIsDrawing(true);
    setStartPos({ x, y });
    setSnapshot(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
    
    ctx.beginPath();
    applyStyles(ctx);
    ctx.moveTo(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Pan Logic
    if (isPanning) {
        const deltaX = e.clientX - lastPanPoint.x;
        const deltaY = e.clientY - lastPanPoint.y;
        setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
        setLastPanPoint({ x: e.clientX, y: e.clientY });
        return;
    }

    // Drawing Logic
    if (!isDrawing || !ctx || !canvasRef.current || !startPos || !snapshot) return;
    const { x, y } = getPos(e);

    // Restore snapshot to avoid trails for shapes
    if (['line', 'arrow', 'rect', 'circle'].includes(tool)) {
      ctx.putImageData(snapshot, 0, 0);
    }

    ctx.beginPath();
    applyStyles(ctx);

    switch (tool) {
      case 'pen':
      case 'highlighter':
      case 'eraser':
        ctx.lineTo(x, y);
        ctx.stroke();
        break;

      case 'line': // Ruler
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        // T-heads
        drawTHeads(ctx, startPos.x, startPos.y, x, y);
        break;

      case 'rect':
        const w = x - startPos.x;
        const h = y - startPos.y;
        if (isFilled) {
             ctx.globalAlpha = opacity * 0.3;
             ctx.fillRect(startPos.x, startPos.y, w, h);
             ctx.globalAlpha = opacity;
        }
        ctx.strokeRect(startPos.x, startPos.y, w, h);
        break;

      case 'circle':
        const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        if (isFilled) {
             ctx.globalAlpha = opacity * 0.3;
             ctx.fill();
             ctx.globalAlpha = opacity;
        }
        ctx.stroke();
        break;

      case 'arrow':
        drawArrow(ctx, startPos.x, startPos.y, x, y);
        break;
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
        setIsPanning(false);
        return;
    }

    if (!isDrawing || !ctx || !startPos) return;
    setIsDrawing(false);
    
    // Ruler Logic: Auto-calculate and show input
    if (tool === 'line') {
        const { x, y } = getPos(e);
        const distancePx = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
        // Roughly 37.8 px per cm (screen dependent, but good estimation)
        const cm = (distancePx / 38).toFixed(1);
        
        // Midpoint
        const midX = (startPos.x + x) / 2;
        const midY = (startPos.y + y) / 2;

        setTextInput({
            isVisible: true,
            x: midX,
            y: midY,
            value: `${cm} cm`
        });
        // Don't save state yet, wait for text commit
    } else {
        if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') ctx.closePath();
        saveState();
    }
  };

  // --- DRAWING HELPERS ---

  const drawArrow = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    const headLength = 15 + lineWidth;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const drawTHeads = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
      // Draw perpendicular lines at ends for "Caliper" look
      const headSize = 8 + lineWidth;
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const perpAngle = angle + Math.PI / 2;

      ctx.beginPath();
      ctx.moveTo(x1 + headSize * Math.cos(perpAngle), y1 + headSize * Math.sin(perpAngle));
      ctx.lineTo(x1 - headSize * Math.cos(perpAngle), y1 - headSize * Math.sin(perpAngle));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x2 + headSize * Math.cos(perpAngle), y2 + headSize * Math.sin(perpAngle));
      ctx.lineTo(x2 - headSize * Math.cos(perpAngle), y2 - headSize * Math.sin(perpAngle));
      ctx.stroke();
  };

  // --- TEXT INPUT HANDLING ---

  const commitText = () => {
    if (!ctx || !textInput.isVisible || !textInput.value.trim()) {
        setTextInput({ ...textInput, isVisible: false });
        if (tool === 'line') saveState(); 
        return;
    }

    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.max(16, lineWidth * 3)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    ctx.shadowColor = "rgba(255,255,255,1)";
    ctx.shadowBlur = 4;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "white";
    ctx.strokeText(textInput.value, textInput.x, textInput.y);
    
    ctx.shadowBlur = 0;
    ctx.fillText(textInput.value, textInput.x, textInput.y);
    ctx.restore();

    saveState();
    setTextInput({ ...textInput, isVisible: false, value: '' });
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          commitText();
      } else if (e.key === 'Escape') {
          setTextInput({ ...textInput, isVisible: false });
          if (tool === 'line') saveState();
      }
  };

  // --- FINALIZATION ---

  const handleSave = async (action: 'download' | 'attach') => {
      if (!canvasRef.current || !dimensions.width) return;
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = dimensions.width;
      tempCanvas.height = dimensions.height;
      const tCtx = tempCanvas.getContext('2d');
      
      if (!tCtx) return;

      const img = new Image();
      img.src = bgImageUrl;
      await new Promise<void>((resolve) => {
          img.onload = () => {
              tCtx.drawImage(img, 0, 0, dimensions.width, dimensions.height);
              resolve();
          };
      });

      tCtx.drawImage(canvasRef.current, 0, 0);

      const dataUrl = tempCanvas.toDataURL('image/png');

      if (action === 'download') {
        const link = document.createElement('a');
        link.download = `laudo_anotado_${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      } else {
        onSave(dataUrl, description);
        alert(`Imagem salva e anexada ao laudo.`);
      }
  };

  // --- COMPONENT RENDER ---
  const ToolButton = ({ t, icon: Icon, label }: { t: Tool, icon: any, label: string }) => (
    <button 
        onClick={() => setTool(t)}
        className={`p-3 rounded-xl transition-all relative group flex items-center justify-center mb-2
        ${tool === t 
            ? 'bg-medical-primary text-white shadow-md ring-2 ring-medical-primary/30 ring-offset-1' 
            : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100 hover:border-gray-300'}`}
        title={label}
    >
        <Icon size={20} />
        <span className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
            {label}
        </span>
    </button>
  );

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 gap-4">
      
      {/* 1. TOP BAR: PROPERTIES */}
      <div className="bg-white border border-medical-border rounded-xl p-3 shadow-sm flex flex-wrap items-center gap-4 md:gap-6 select-none relative z-20">
         
         {/* Colors */}
         <div className="flex items-center gap-2">
            <Palette size={16} className="text-gray-400" />
            <div className="flex gap-1.5">
                {(['#EF4444', '#EAB308', '#22C55E', '#3B82F6', '#9333EA', '#000000', '#FFFFFF'] as Color[]).map(c => (
                    <button 
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border border-black/10 shadow-sm transition-transform hover:scale-110 
                        ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}
                        ${c === '#FFFFFF' ? 'bg-gray-100' : ''} 
                    `}
                    style={{ backgroundColor: c }}
                    title={c}
                    />
                ))}
            </div>
         </div>

         <div className="w-px h-6 bg-gray-200"></div>

         {/* Line Settings */}
         <div className="flex items-center gap-4">
             <div className="flex flex-col w-28">
                <label className="text-[9px] font-bold text-gray-400 uppercase flex justify-between">
                    Traço / Fonte <span>{lineWidth}px</span>
                </label>
                <input 
                    type="range" min="1" max="25" step="1" 
                    value={lineWidth} onChange={(e) => setLineWidth(Number(e.target.value))}
                    className="h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-medical-primary mt-1"
                />
             </div>
         </div>

         <div className="w-px h-6 bg-gray-200"></div>

         {/* Style Toggles */}
         <div className="flex items-center gap-2">
             <div className="flex bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setLineStyle('solid')} className={`p-1.5 rounded ${lineStyle === 'solid' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`} title="Linha Sólida">
                    <Minus size={14} />
                </button>
                <button onClick={() => setLineStyle('dashed')} className={`p-1.5 rounded ${lineStyle === 'dashed' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`} title="Tracejada">
                    <MoreHorizontalIcon />
                </button>
             </div>

             <button 
                onClick={() => setIsFilled(!isFilled)}
                className={`p-2 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all ${isFilled ? 'bg-medical-secondary text-medical-primary border-medical-primary/30' : 'bg-white text-gray-500 border-gray-200'}`}
                title="Preenchimento (Círculo/Retângulo)"
             >
                <PaintBucket size={14} />
                {isFilled ? 'Preenchido' : 'Vazio'}
             </button>
         </div>

         <div className="w-px h-6 bg-gray-200"></div>

         {/* Zoom Controls */}
         <div className="flex items-center gap-2 bg-blue-50 p-1 rounded-lg border border-blue-100">
             <button onClick={() => handleZoom(-0.1)} className="p-1.5 hover:bg-white hover:text-blue-600 rounded-md text-gray-500 transition-colors" title="Zoom Out">
                <ZoomOut size={16} />
             </button>
             <span className="text-[10px] font-bold text-blue-800 w-8 text-center">{Math.round(zoom * 100)}%</span>
             <button onClick={() => handleZoom(0.1)} className="p-1.5 hover:bg-white hover:text-blue-600 rounded-md text-gray-500 transition-colors" title="Zoom In">
                <ZoomIn size={16} />
             </button>
             <button onClick={resetView} className="p-1.5 hover:bg-white hover:text-blue-600 rounded-md text-gray-500 transition-colors" title="Resetar Visualização">
                <Maximize size={16} />
             </button>
         </div>

         <div className="flex-1"></div>

         {/* Undo / Redo / Clear */}
         <div className="flex gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
            <button onClick={handleUndo} disabled={history.length <= 1} className="p-2 text-gray-600 hover:text-medical-primary hover:bg-white rounded-lg disabled:opacity-30 disabled:hover:bg-transparent" title="Desfazer (Ctrl+Z)">
                <Undo size={18} />
            </button>
            <button onClick={handleRedo} disabled={redoStack.length === 0} className="p-2 text-gray-600 hover:text-medical-primary hover:bg-white rounded-lg disabled:opacity-30 disabled:hover:bg-transparent" title="Refazer (Ctrl+Y)">
                <Redo size={18} />
            </button>
            <div className="w-px h-full bg-gray-200 mx-1"></div>
            <button onClick={clearCanvas} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Limpar Tudo">
                <Trash2 size={18} />
            </button>
         </div>
      </div>

      <div className="flex flex-row h-full gap-4 min-h-[500px]">
        {/* 2. SIDEBAR: TOOLS */}
        <div className="flex flex-col gap-1 w-16 flex-shrink-0 relative z-20">
            <ToolButton t="pen" icon={Pencil} label="Lápis" />
            <ToolButton t="highlighter" icon={Highlighter} label="Marca-Texto" />
            <ToolButton t="eraser" icon={Eraser} label="Borracha (Apagar)" />
            <div className="h-px bg-gray-200 my-2 mx-2"></div>
            <ToolButton t="pan" icon={Hand} label="Pan (Mover)" />
            <div className="h-px bg-gray-200 my-2 mx-2"></div>
            <ToolButton t="line" icon={Ruler} label="Régua (Medida Auto)" />
            <ToolButton t="arrow" icon={MoveRight} label="Seta" />
            <ToolButton t="circle" icon={CircleIcon} label="Círculo" />
            <ToolButton t="rect" icon={Square} label="Retângulo" />
            <div className="h-px bg-gray-200 my-2 mx-2"></div>
            <ToolButton t="text" icon={Type} label="Texto (Clicar e Digitar)" />
        </div>

        {/* 3. CANVAS AREA */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
            <div 
                ref={containerRef}
                className="relative flex-1 bg-gray-200/50 border-2 border-medical-border border-dashed rounded-xl overflow-hidden shadow-inner select-none"
                style={{ cursor: tool === 'pan' || isPanning ? 'grab' : 'crosshair' }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {dimensions.width > 0 && (
                    <div 
                        className="relative shadow-lg origin-top-left transition-transform duration-75 ease-out" 
                        style={{ 
                            width: dimensions.width, 
                            height: dimensions.height,
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
                        }}
                    >
                        {/* Layer 1: Background Image */}
                        <img 
                            src={bgImageUrl} 
                            alt="Background" 
                            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                        />
                        
                        {/* Layer 2: Drawing Canvas (Transparent) */}
                        <canvas 
                            ref={canvasRef}
                            className="absolute inset-0 w-full h-full z-10"
                        />

                        {/* Layer 3: Floating UI (Text Input) - needs to move with zoom/pan logic via CSS transform parent */}
                        {textInput.isVisible && (
                            <div 
                                className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2"
                                style={{ 
                                    left: textInput.x, // x is in World Coords, parent div scales, so this is correct
                                    top: textInput.y 
                                }}
                            >
                                <input
                                    ref={textInputRef}
                                    type="text"
                                    value={textInput.value}
                                    onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
                                    onKeyDown={handleInputKeyDown}
                                    onBlur={commitText}
                                    className="bg-white/80 border-2 border-medical-primary text-medical-bordeaux font-bold px-2 py-1 rounded shadow-lg outline-none min-w-[100px] text-center"
                                    style={{ 
                                        fontSize: Math.max(14, lineWidth * 2),
                                        // Counter-scale text input so it stays readable if zoomed way out/in? 
                                        // No, simpler to let it scale with image for context.
                                    }}
                                    placeholder="Digite..."
                                />
                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] bg-black/70 text-white px-2 rounded whitespace-nowrap">
                                    Enter para confirmar
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {!dimensions.width && <div className="text-gray-400 flex items-center justify-center h-full gap-2"><MousePointer2 className="animate-bounce" /> Carregando imagem...</div>}
                
                {/* Floating Info */}
                <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
                    Zoom: {Math.round(zoom*100)}% | Pan: {Math.round(pan.x)},{Math.round(pan.y)}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-white p-4 rounded-xl border border-medical-border shadow-soft flex flex-wrap gap-4 items-center justify-between relative z-20">
                <div className="flex-1 min-w-[200px]">
                     <input 
                        type="text" 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Adicionar nota técnica ao laudo (ex: Nódulo sólido QSE)..."
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-medical-primary outline-none"
                    />
                </div>
                
                <div className="flex gap-2">
                    <button onClick={onCancel} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-xs font-bold">
                        Cancelar
                    </button>
                    <button 
                        onClick={() => handleSave('download')}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs font-bold flex items-center gap-2"
                    >
                        <Download size={16} /> Baixar PNG
                    </button>
                    
                    <button 
                        onClick={() => handleSave('attach')}
                        className="px-5 py-2 bg-medical-primary text-white rounded-lg hover:bg-medical-primaryDark transition-colors text-xs font-bold flex items-center gap-2 shadow-md"
                    >
                        <ClipboardPlus size={16} /> Salvar & Anexar
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

// Helper Icon for Dashed Line
const MoreHorizontalIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
        <circle cx="5" cy="12" r="1" />
    </svg>
);

export default ImageDrawingCanvas;