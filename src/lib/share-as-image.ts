'use client';

import { toBlob } from 'html-to-image';
import { toast } from '@/hooks/use-toast';

export async function shareAsImage(
    element: HTMLElement | null,
    fileName: string,
    shareTitle: string,
    shareText: string
) {
    if (!element) {
        toast({
            variant: 'destructive',
            title: 'Error al compartir',
            description: 'No se pudo encontrar el contenido para generar la imagen.',
        });
        return;
    }

    const html = document.documentElement;
    const isDarkMode = html.classList.contains('dark');
    
    // Find and temporarily remove the Google Fonts stylesheet(s) to prevent SecurityError
    const fontLinks = document.querySelectorAll('link[href*="fonts.googleapis.com"]');
    fontLinks.forEach(link => link.parentElement?.removeChild(link));

    // Temporarily switch to light mode for image generation to ensure correct colors
    if (isDarkMode) {
        html.classList.remove('dark');
    }

    try {
        const blob = await toBlob(element, {
            backgroundColor: '#ffffff',
            pixelRatio: 2,
            cacheBust: true,
        });

        if (!blob) {
            throw new Error('La generación de la imagen resultó en un blob nulo.');
        }

        const file = new File([blob], fileName, { type: 'image/png' });

        // --- NEW LOGIC: Try Share, then Clipboard, then Download ---

        // 1. Try Web Share API
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: shareTitle,
                    text: shareText,
                });
                return; // Success!
            } catch (error) {
                 if ((error as DOMException).name === 'AbortError') {
                    // User cancelled the share, do nothing.
                    return;
                }
                console.error('Web Share API failed, trying next fallback:', error);
            }
        }
        
        // 2. Fallback to Clipboard API
        // @ts-ignore
        if (navigator.clipboard && navigator.clipboard.write) {
            try {
                // @ts-ignore
                await navigator.clipboard.write([
                    // @ts-ignore
                    new ClipboardItem({ 'image/png': blob })
                ]);
                toast({
                    title: 'Imagen copiada',
                    description: 'El comprobante se ha copiado a tu portapapeles.',
                });
                return; // Success!
            } catch (error) {
                console.error('Clipboard API failed, trying next fallback:', error);
            }
        }

        // 3. Last resort: Download the file
        const link = document.createElement('a');
        link.href = URL.createObjectURL(file);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        toast({
            title: 'Imagen descargada',
            description: 'No se pudo compartir ni copiar. La imagen ha sido descargada.',
        });


    } catch (error) {
        console.error('Error al generar la imagen', error);
        toast({
            variant: 'destructive',
            title: 'Error al compartir',
            description: 'Hubo un problema al crear la imagen para compartir.',
        });
    } finally {
        // ALWAYS switch back to the original theme
        if (isDarkMode) {
            html.classList.add('dark');
        }
        // And re-add the font links
        fontLinks.forEach(link => document.head.appendChild(link));
    }
}
