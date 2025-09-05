import React, { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import CodeBlock from '@tiptap/extension-code-block';
import Code from '@tiptap/extension-code';
import Placeholder from '@tiptap/extension-placeholder';
import FontFamily from '@tiptap/extension-font-family';
import FontSize from '@tiptap/extension-font-size';
import { Indent } from './editor-extensions/indent';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { 
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code as CodeIcon,
  Code2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Image as ImageIcon,
  Link as LinkIcon,
  Palette,
  Highlighter,
  Type,
  Move,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onImageUpload?: (file: File) => Promise<string>;
}

// Available font families
const fontFamilies = [
  { value: 'default', label: 'Default', font: 'inherit' },
  { value: 'arial', label: 'Arial', font: 'Arial, sans-serif' },
  { value: 'helvetica', label: 'Helvetica', font: 'Helvetica, Arial, sans-serif' },
  { value: 'times', label: 'Times New Roman', font: 'Times New Roman, serif' },
  { value: 'georgia', label: 'Georgia', font: 'Georgia, serif' },
  { value: 'verdana', label: 'Verdana', font: 'Verdana, Geneva, sans-serif' },
  { value: 'courier', label: 'Courier New', font: 'Courier New, monospace' },
  { value: 'tahoma', label: 'Tahoma', font: 'Tahoma, Geneva, sans-serif' },
  { value: 'trebuchet', label: 'Trebuchet MS', font: 'Trebuchet MS, sans-serif' },
  { value: 'impact', label: 'Impact', font: 'Impact, Charcoal, sans-serif' },
  { value: 'comic', label: 'Comic Sans MS', font: 'Comic Sans MS, cursive' },
  { value: 'lucida', label: 'Lucida Console', font: 'Lucida Console, Monaco, monospace' }
];

// Available font sizes
const fontSizes = [
  { value: '8px', label: '8px' },
  { value: '10px', label: '10px' },
  { value: '12px', label: '12px' },
  { value: '14px', label: '14px' },
  { value: '16px', label: '16px' },
  { value: '18px', label: '18px' },
  { value: '20px', label: '20px' },
  { value: '24px', label: '24px' },
  { value: '28px', label: '28px' },
  { value: '32px', label: '32px' },
  { value: '36px', label: '36px' },
  { value: '48px', label: '48px' },
  { value: '72px', label: '72px' }
];

// Predefined color palette for quick access
const colorPalette = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
  '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#a4c2f4', '#b4a7d6', '#d5a6bd'
];

// Predefined highlight colors
const highlightColors = [
  '#ffeb3b', '#ff9800', '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
  '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722', '#795548', '#9e9e9e'
];

const MenuBar = ({ editor }: { editor: any }) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [selectedHighlight, setSelectedHighlight] = useState('#ffeb3b');

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt('URL');

    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const setFontFamily = useCallback((fontFamily: string) => {
    const font = fontFamilies.find(f => f.value === fontFamily);
    if (font) {
      editor.chain().focus().setFontFamily(font.font).run();
    }
  }, [editor]);

  const setFontSize = useCallback((fontSize: string) => {
    editor.chain().focus().setFontSize(fontSize).run();
  }, [editor]);

  const setTextColor = useCallback((color: string) => {
    editor.chain().focus().setColor(color).run();
    setSelectedColor(color);
    setShowColorPicker(false);
  }, [editor]);

  const setHighlightColor = useCallback((color: string) => {
    editor.chain().focus().toggleHighlight({ color }).run();
    setSelectedHighlight(color);
    setShowHighlightPicker(false);
  }, [editor]);

  const removeHighlight = useCallback(() => {
    editor.chain().focus().unsetHighlight().run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  // Get current font family and size for the dropdowns
  const currentFontFamily = editor.getAttributes('textStyle').fontFamily || 'default';
  const currentFontSize = editor.getAttributes('textStyle').fontSize || '14px';

  return (
    <div className="border-b border-border p-2 flex flex-wrap gap-1 items-center">
      {/* Font Family Dropdown */}
      <div className="flex items-center gap-2 mr-2">
        <Type className="h-4 w-4 text-muted-foreground" />
        <Select value={currentFontFamily} onValueChange={setFontFamily}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fontFamilies.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                <span style={{ fontFamily: font.font }}>{font.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font Size Dropdown */}
      <Select value={currentFontSize} onValueChange={setFontSize}>
        <SelectTrigger className="w-20 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {fontSizes.map((size) => (
            <SelectItem key={size.value} value={size.value}>
              {size.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Text Formatting Buttons */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(editor.isActive('bold') && 'bg-accent')}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(editor.isActive('italic') && 'bg-accent')}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={cn(editor.isActive('underline') && 'bg-accent')}
      >
        <UnderlineIcon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={cn(editor.isActive('strike') && 'bg-accent')}
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={cn(editor.isActive('code') && 'bg-accent')}
      >
        <CodeIcon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={cn(editor.isActive('codeBlock') && 'bg-accent')}
      >
        <Code2 className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-6 bg-border mx-1" />
      
      {/* Color Controls */}
      <div className="relative">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="flex items-center gap-1"
          title="Text Color"
        >
          <Palette className="h-4 w-4" />
          <div 
            className="w-3 h-3 rounded border border-border" 
            style={{ backgroundColor: selectedColor }}
          />
        </Button>
        {showColorPicker && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-background border border-border rounded-md shadow-lg z-50 w-64">
            <div className="grid grid-cols-10 gap-1">
              {colorPalette.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => setTextColor(color)}
                  title={color}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-8 h-8 rounded border border-border cursor-pointer"
              />
              <span className="text-xs text-muted-foreground">Custom color</span>
            </div>
          </div>
        )}
      </div>

      {/* Highlight Controls */}
      <div className="relative">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowHighlightPicker(!showHighlightPicker)}
          className="flex items-center gap-1"
          title="Highlight Color"
        >
          <Highlighter className="h-4 w-4" />
          <div 
            className="w-3 h-3 rounded border border-border" 
            style={{ backgroundColor: selectedHighlight }}
          />
        </Button>
        {showHighlightPicker && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-background border border-border rounded-md shadow-lg z-50 w-64">
            <div className="grid grid-cols-10 gap-1">
              {highlightColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => setHighlightColor(color)}
                  title={color}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="color"
                value={selectedHighlight}
                onChange={(e) => setSelectedHighlight(e.target.value)}
                className="w-8 h-8 rounded border border-border cursor-pointer"
              />
              <span className="text-xs text-muted-foreground">Custom highlight</span>
            </div>
            <div className="mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={removeHighlight}
                className="w-full text-xs"
              >
                Remove Highlight
              </Button>
            </div>
          </div>
        )}
      </div>
      
      <div className="w-px h-6 bg-border mx-1" />
      
      {/* Text Alignment Buttons */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={cn(editor.isActive({ textAlign: 'left' }) && 'bg-accent')}
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={cn(editor.isActive({ textAlign: 'center' }) && 'bg-accent')}
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={cn(editor.isActive({ textAlign: 'right' }) && 'bg-accent')}
      >
        <AlignRight className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        className={cn(editor.isActive({ textAlign: 'justify' }) && 'bg-accent')}
      >
        <AlignJustify className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-6 bg-border mx-1" />
      
      {/* List and Quote Buttons */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(editor.isActive('bulletList') && 'bg-accent')}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(editor.isActive('orderedList') && 'bg-accent')}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={cn(editor.isActive('blockquote') && 'bg-accent')}
      >
        <Quote className="h-4 w-4" />
      </Button>

      {/* Increase / Decrease Indent */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        title="Increase indent"
        onClick={() => editor.chain().focus().increaseIndent().run()}
        disabled={!editor.can().increaseIndent()}
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        title="Decrease indent"
        onClick={() => editor.chain().focus().decreaseIndent().run()}
        disabled={!editor.can().decreaseIndent()}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-6 bg-border mx-1" />
      
      {/* Link and Image Buttons */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={setLink}
        className={cn(editor.isActive('link') && 'bg-accent')}
      >
        <LinkIcon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addImage}
        title="Insert image by URL"
      >
        <ImageIcon className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-6 bg-border mx-1" />
      
      {/* Undo/Redo Buttons */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  );
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start writing...',
  className,
  onImageUpload
}) => {
  const editor = useEditor({
    extensions: [
             StarterKit,
      Indent,
      Image.configure({
        HTMLAttributes: {
          class: 'resizable-image',
        },
        allowBase64: true,
        inline: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      TextStyle,
      Color.configure({
        types: ['textStyle'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      CodeBlock,
      Code,
      Placeholder.configure({
        placeholder,
      }),
      FontFamily.configure({
        types: ['textStyle'],
      }),
      FontSize.configure({
        types: ['textStyle'],
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        style: 'color: #000000; line-height: 1; font-size: 14px;', // Set default text color to black, line height to 1, and font size to 14px
      },
    },
  });

  // Keep editor content in sync when the bound value prop changes externally
  useEffect(() => {
    if (!editor) return;
    try {
      const current = editor.getHTML();
      if (value !== current) {
        editor.commands.setContent(value || '', false);
      }
    } catch {
      // no-op safeguard
    }
  }, [value, editor]);

  // Handle paste events for images
  useEffect(() => {
    if (!editor) return;

    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Handle image paste
        if (item.type.indexOf('image') !== -1) {
          event.preventDefault();
          
          const file = item.getAsFile();
          if (!file) continue;

          try {
            // Convert to base64 for immediate display
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target?.result as string;
              if (result) {
                 // Insert the image at the current cursor position using setImage
                 const imageNode = editor.chain().focus().setImage({ src: result }).run();
                
                // Debug: Check if image was inserted
                console.log('Image insertion result:', imageNode);
                console.log('Editor content after insertion:', editor.getHTML());
                
                                 // Add resize handle to the newly inserted image
                 setTimeout(() => {
                   // Force a DOM update to ensure the image is rendered
                   editor.view.updateState(editor.view.state);
                   
                   // Wait a bit more for the DOM to be fully updated
                   setTimeout(() => {
                     const images = editor.view.dom.querySelectorAll('img');
                     console.log('Found images in DOM:', images.length);
                     const lastImage = images[images.length - 1];
                     if (lastImage) {
                       console.log('Processing last image:', lastImage);
                       console.log('Image src:', lastImage.src);
                       console.log('Image classes:', lastImage.className);
                       console.log('Image tagName:', lastImage.tagName);
                       console.log('Image outerHTML:', lastImage.outerHTML);
                       
                       // Ensure the image has the resizable class
                       if (!lastImage.classList.contains('resizable-image')) {
                         console.log('Adding resizable class to image');
                         lastImage.classList.add('resizable-image');
                       }
                       
                       // Add resize handle directly to this image
                       if (!lastImage.querySelector('.resize-handle')) {
                         console.log('Adding resize handle to image');
                         const handle = document.createElement('div');
                         handle.className = 'resize-handle';
                         handle.style.cssText = `
                           position: absolute;
                           bottom: -5px;
                           right: -5px;
                           width: 10px;
                           height: 10px;
                           background: #007bff;
                           border: 1px solid #fff;
                           border-radius: 50%;
                           cursor: se-resize;
                           z-index: 1000;
                         `;
                         
                         // Ensure image is positioned relatively for the handle
                         (lastImage as HTMLElement).style.position = 'relative';
                         (lastImage as HTMLElement).appendChild(handle);
                         console.log('Resize handle successfully added to image');
                       } else {
                         console.log('Image already has resize handle');
                       }
                     } else {
                       console.log('No image found in DOM');
                     }
                   }, 100);
                 }, 200);
              }
            };
            reader.readAsDataURL(file);

            // If onImageUpload callback is provided, also upload the file
            if (onImageUpload) {
              try {
                const uploadedUrl = await onImageUpload(file);
                // Optionally replace the base64 with the uploaded URL
                // This would require more complex logic to find and replace the image
                console.log('Image uploaded:', uploadedUrl);
              } catch (uploadError) {
                console.warn('Failed to upload pasted image:', uploadError);
              }
            }
          } catch (error) {
            console.error('Failed to process pasted image:', error);
          }
          break;
        }
      }
    };

    // Add paste event listener to the editor DOM element
    const editorElement = editor.view.dom;
    editorElement.addEventListener('paste', handlePaste);

    return () => {
      editorElement.removeEventListener('paste', handlePaste);
    };
  }, [editor, onImageUpload]);

  // Add image resize functionality
  useEffect(() => {
    if (!editor) return;

    const handleImageResize = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.classList.contains('resize-handle')) return;

      const image = target.closest('.resizable-image') as HTMLImageElement;
      if (!image) return;

      const startX = event.clientX;
      const startY = event.clientY;
      const startWidth = image.offsetWidth;
      const startHeight = image.offsetHeight;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        
        const newWidth = Math.max(50, startWidth + deltaX);
        const newHeight = Math.max(50, startHeight + deltaY);
        
        image.style.width = `${newWidth}px`;
        image.style.height = `${newHeight}px`;
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

         // Add resize handles to images
     const addResizeHandles = () => {
       const images = editor.view.dom.querySelectorAll('img');
       console.log('Adding resize handles to', images.length, 'images');
       images.forEach((img, index) => {
         console.log(`Processing image ${index}:`, img);
         
         if (img.querySelector('.resize-handle')) {
           console.log(`Image ${index} already has resize handle`);
           return; // Already has handles
         }
         
         // Ensure the image has the resizable class
         if (!img.classList.contains('resizable-image')) {
           console.log(`Adding resizable class to image ${index}`);
           img.classList.add('resizable-image');
         }
         
         console.log(`Creating resize handle for image ${index}`);
         const handle = document.createElement('div');
         handle.className = 'resize-handle';
         handle.style.cssText = `
           position: absolute;
           bottom: -5px;
           right: -5px;
           width: 10px;
           height: 10px;
           background: #007bff;
           border: 1px solid #fff;
           border-radius: 50%;
           cursor: se-resize;
           z-index: 1000;
         `;
         
         // Ensure image is positioned relatively for the handle
         (img as HTMLElement).style.position = 'relative';
         (img as HTMLElement).appendChild(handle);
         console.log(`Resize handle successfully added to image ${index}`);
       });
     };

    // Add click listener for resize
    editor.view.dom.addEventListener('mousedown', handleImageResize);
    
    // Add resize handles when content changes
    const observer = new MutationObserver(addResizeHandles);
    observer.observe(editor.view.dom, { childList: true, subtree: true });
    
         // Initial add of resize handles
     addResizeHandles();
     
     // Also add resize handles after a delay to ensure they're added
     setTimeout(addResizeHandles, 1000);
     setTimeout(addResizeHandles, 2000);

    return () => {
      editor.view.dom.removeEventListener('mousedown', handleImageResize);
      observer.disconnect();
    };
  }, [editor]);

  return (
    <div className={cn('border border-input rounded-md bg-background', className)}>
      <MenuBar editor={editor} />
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-[200px] focus:outline-none text-black"
        style={{
          '--tw-prose-body': 'inherit',
        } as React.CSSProperties}
      />
      
      {/* Custom CSS to enforce default line height and add controlled spacing */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Force default line height on all paragraphs */
          .ProseMirror p { line-height: 1 !important; }
          .ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6 { line-height: 1 !important; }
          
          /* Override TipTap prose classes - add controlled spacing and set line height */
          .prose p { 
            line-height: 1 !important; 
            margin-top: 0.3rem !important; 
            margin-bottom: 0.3rem !important; 
          }
          .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 { 
            line-height: 1 !important; 
            margin-top: 0.3rem !important; 
            margin-bottom: 0.3rem !important; 
          }
          
          /* Apply custom line heights when set */
          .ProseMirror [style*="line-height"] { line-height: inherit !important; }
          
          /* Add controlled spacing between prose elements */
          .prose > * + * { margin-top: 0.3rem !important; }
          
                     /* Image resize styles */
           .resizable-image {
             position: relative !important;
             display: inline-block !important;
             max-width: 100%;
             height: auto;
           }
           
           /* Ensure all images in the editor are resizable */
           .ProseMirror img {
             position: relative !important;
             display: inline-block !important;
             max-width: 100% !important;
             height: auto !important;
           }
           
           .ProseMirror img:not(.resizable-image) {
             position: relative !important;
           }
           
           .resize-handle {
             position: absolute !important;
             bottom: -5px !important;
             right: -5px !important;
             width: 10px !important;
             height: 10px !important;
             background: #007bff !important;
             border: 1px solid #fff !important;
             border-radius: 50% !important;
             cursor: se-resize !important;
             z-index: 1000 !important;
             transition: all 0.2s ease;
             box-shadow: 0 2px 4px rgba(0,0,0,0.3);
           }
           
           .resize-handle:hover {
             background: #0056b3 !important;
             transform: scale(1.2);
           }
        `
      }} />
      <div className="px-4 pb-2 text-xs text-muted-foreground border-t border-border pt-2">
        💡 Tip: You can paste images directly from your clipboard (Ctrl+V), change fonts and sizes using the dropdowns above, use colors and highlights, or use the image button to insert from URL. Images can be resized by dragging the blue handle in the bottom-right corner.
      </div>
    </div>
  );
};
