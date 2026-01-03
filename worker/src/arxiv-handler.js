// ===================================
// arXiv Source Handler
// ===================================

/**
 * Fetch and process arXiv source
 */
export async function fetchArxivSource(arxivId) {
    // Convert to source URL
    const sourceUrl = `https://arxiv.org/src/${arxivId}`;

    try {
        const response = await fetch(sourceUrl);

        if (!response.ok) {
            throw new Error(`arXiv source not available for ${arxivId}`);
        }

        // Get the tar.gz file
        const arrayBuffer = await response.arrayBuffer();

        // Decompress gzip using DecompressionStream (native Web API)
        const stream = new Response(arrayBuffer).body
            .pipeThrough(new DecompressionStream('gzip'));
        const decompressedBuffer = await new Response(stream).arrayBuffer();
        const decompressed = new Uint8Array(decompressedBuffer);

        // Parse tar archive
        const files = parseTar(decompressed);

        return files;

    } catch (error) {
        console.error('Error fetching arXiv source:', error);
        throw new Error('Failed to download arXiv source. The paper may not have source files available.');
    }
}

/**
 * Simple TAR parser for arXiv sources
 */
function parseTar(buffer) {
    const files = [];
    let offset = 0;

    while (offset < buffer.length) {
        // TAR header is 512 bytes
        if (offset + 512 > buffer.length) break;

        // Read filename (first 100 bytes)
        const nameBytes = buffer.slice(offset, offset + 100);
        const name = new TextDecoder().decode(nameBytes).replace(/\0/g, '').trim();

        // If no name, we've reached the end
        if (!name) break;

        // Read file size (bytes 124-135)
        const sizeBytes = buffer.slice(offset + 124, offset + 136);
        const sizeStr = new TextDecoder().decode(sizeBytes).replace(/\0/g, '').trim();
        const size = parseInt(sizeStr, 8) || 0;

        // Read file type (byte 156)
        const typeFlag = String.fromCharCode(buffer[offset + 156]);

        // Skip header (512 bytes)
        offset += 512;

        // Read file content
        if (size > 0 && typeFlag !== '5') { // '5' means directory
            const content = buffer.slice(offset, offset + size);

            // Determine file type
            const ext = name.split('.').pop().toLowerCase();
            const isText = ['tex', 'txt', 'bib', 'sty', 'cls', 'bst'].includes(ext);
            const isImage = ['pdf', 'png', 'jpg', 'jpeg', 'eps', 'svg'].includes(ext);

            const fileData = {
                path: name,
                size: size,
                type: isText ? 'text' : isImage ? 'image' : 'binary',
                extension: ext
            };

            if (isText) {
                // Decode as text
                fileData.content = new TextDecoder('utf-8', { fatal: false }).decode(content);
            } else if (isImage) {
                // Store as base64 for images
                fileData.binary = content;
                fileData.base64 = arrayBufferToBase64(content);
            }

            files.push(fileData);
        }

        // Move to next file (files are padded to 512-byte boundaries)
        const paddedSize = Math.ceil(size / 512) * 512;
        offset += paddedSize;
    }

    return files;
}

/**
 * Convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Find main LaTeX file
 */
export function findMainTexFile(files) {
    // Look for files with \documentclass
    for (const file of files) {
        if (file.type === 'text' && file.extension === 'tex' && file.content) {
            if (file.content.includes('\\documentclass')) {
                return file;
            }
        }
    }

    // Fallback: look for main.tex or paper.tex
    const commonNames = ['main.tex', 'paper.tex', 'manuscript.tex'];
    for (const name of commonNames) {
        const file = files.find(f => f.path.toLowerCase().endsWith(name));
        if (file) return file;
    }

    // Return first .tex file
    return files.find(f => f.extension === 'tex');
}

/**
 * Extract LaTeX structure
 */
export function extractLatexStructure(files, mainFile) {
    const structure = {
        mainFile: mainFile.path,
        title: '',
        sections: [],
        figures: [],
        allTexContent: ''
    };

    // Collect all tex content
    const texFiles = files.filter(f => f.type === 'text' && f.extension === 'tex');
    structure.allTexContent = texFiles.map(f => `% File: ${f.path}\n${f.content}`).join('\n\n');

    // Extract title - search all tex files, handle multiline titles
    let titleFound = false;
    for (const texFile of texFiles) {
        // Match \title{...} with multiline support, using regex to handle nested braces
        // Use a simpler approach: find \title{ and extract until matching }
        const titleStart = texFile.content.indexOf('\\title{');
        if (titleStart !== -1) {
            // Find the matching closing brace
            let braceCount = 0;
            let i = titleStart + 7; // Start after '\title{'
            let titleEnd = -1;

            while (i < texFile.content.length) {
                if (texFile.content[i] === '{') {
                    braceCount++;
                } else if (texFile.content[i] === '}') {
                    if (braceCount === 0) {
                        titleEnd = i;
                        break;
                    }
                    braceCount--;
                }
                i++;
            }

            if (titleEnd !== -1) {
                let title = texFile.content.slice(titleStart + 7, titleEnd);
                console.log('[DEBUG] Raw title from LaTeX:', title);
                // Remove newlines and extra whitespace
                title = title.replace(/\n/g, ' ').replace(/\s+/g, ' ');
                // Remove LaTeX commands but keep their content (e.g., \revThree{text} -> text)
                title = title.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1');
                // Remove remaining backslash commands
                title = title.replace(/\\[a-zA-Z]+/g, '');
                // Clean up extra spaces and braces
                title = title.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
                console.log('[DEBUG] Cleaned title:', title);
                structure.title = title;
                titleFound = true;
                break;
            }
        }
    }

    if (!titleFound) {
        console.log('[DEBUG] No title match found in any tex files');
    }

    // Extract figures
    const figureRegex = /\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g;
    const captionRegex = /\\caption\{([^}]+)\}/g;
    const labelRegex = /\\label\{([^}]+)\}/g;

    let match;
    const figureMatches = [];

    // Find all includegraphics
    while ((match = figureRegex.exec(structure.allTexContent)) !== null) {
        figureMatches.push({
            index: match.index,
            path: match[1]
        });
    }

    // For each figure, try to find caption and label nearby
    for (const figMatch of figureMatches) {
        const surroundingText = structure.allTexContent.slice(
            Math.max(0, figMatch.index - 500),
            Math.min(structure.allTexContent.length, figMatch.index + 500)
        );

        const captionMatch = surroundingText.match(captionRegex);
        const labelMatch = surroundingText.match(labelRegex);

        // Find the actual file
        let figurePath = figMatch.path;
        // Remove any relative path indicators
        figurePath = figurePath.replace(/^\.\//, '');

        // Find matching file (may not have extension in LaTeX)
        const imageFile = files.find(f =>
            f.type === 'image' && (
                f.path === figurePath ||
                f.path.startsWith(figurePath) ||
                f.path.endsWith('/' + figurePath) ||
                f.path.includes(figurePath)
            )
        );

        if (imageFile) {
            structure.figures.push({
                label: labelMatch ? labelMatch[1] : `fig:${structure.figures.length}`,
                caption: captionMatch ? captionMatch[1] : '',
                path: imageFile.path,
                format: imageFile.extension,
                base64: imageFile.base64
            });
        }
    }

    return structure;
}
