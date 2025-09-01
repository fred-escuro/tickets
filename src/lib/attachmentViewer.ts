import { type TicketAttachment } from '@/data/mockData';

// Function to open attachment viewer in a new window
export const openAttachmentViewer = (
  attachments: TicketAttachment[],
  initialIndex: number = 0
) => {
  const windowFeatures = [
    'width=800',
    'height=600',
    'scrollbars=yes',
    'resizable=yes',
    'toolbar=no',
    'menubar=no',
    'location=no',
    'status=no'
  ].join(',');

  const viewerWindow = window.open(
    '',
    'attachment-viewer',
    windowFeatures
  );

  if (!viewerWindow) {
    alert('Please allow popups to view attachments');
    return null;
  }

  // Create the HTML content for the popup window
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Attachment Viewer</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .attachment-viewer { height: 100vh; display: flex; flex-direction: column; }
        .header { padding: 1rem; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; background: white; }
        .content { flex: 1; display: flex; align-items: center; justify-content: center; padding: 1rem; position: relative; overflow: hidden; }
        .navigation-arrow { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.9); border: none; border-radius: 0.5rem; padding: 0.5rem; cursor: pointer; }
        .navigation-arrow:hover { background: rgba(255,255,255,1); }
        .navigation-arrow.left { left: 1rem; }
        .navigation-arrow.right { right: 1rem; }
        .thumbnail-nav { padding: 1rem; border-top: 1px solid #e5e7eb; background: white; }
        .thumbnail-container { display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.5rem; }
        .thumbnail { flex-shrink: 0; width: 4rem; height: 4rem; border-radius: 0.5rem; border: 2px solid #e5e7eb; overflow: hidden; cursor: pointer; }
        .thumbnail.active { border-color: #3b82f6; }
        .thumbnail img { width: 100%; height: 100%; object-fit: cover; }
        .thumbnail-icon { width: 100%; height: 100%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
        .btn { padding: 0.5rem; border: none; border-radius: 0.375rem; cursor: pointer; background: #f3f4f6; margin-left: 0.25rem; }
        .btn:hover { background: #e5e7eb; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .image-container { max-width: 100%; max-height: 100%; overflow: auto; }
        .image-container img { max-width: 100%; max-height: 100%; object-fit: contain; transition: transform 0.2s ease-in-out; }
        .file-info { text-align: center; }
        .file-icon { width: 8rem; height: 8rem; background: #f3f4f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; }
        .file-actions { display: flex; gap: 0.5rem; justify-content: center; margin-top: 1rem; }
        .action-btn { padding: 0.5rem 1rem; border: 1px solid #d1d5db; border-radius: 0.375rem; background: white; cursor: pointer; }
        .action-btn:hover { background: #f9fafb; }
        .action-btn.primary { background: #3b82f6; color: white; border-color: #3b82f6; }
        .action-btn.primary:hover { background: #2563eb; }
      </style>
    </head>
    <body>
      <div class="attachment-viewer">
        <div class="header">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div id="file-icon"></div>
            <div>
              <h3 id="file-name" style="font-weight: 500; margin: 0; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"></h3>
              <p id="file-info" style="font-size: 0.875rem; color: #6b7280; margin: 0;"></p>
            </div>
            <span id="file-counter" style="background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; border: 1px solid #e5e7eb;"></span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div id="image-controls" style="display: none;">
              <button class="btn" id="zoom-out" title="Zoom Out">−</button>
              <button class="btn" id="zoom-in" title="Zoom In">+</button>
              <button class="btn" id="rotate" title="Rotate">↻</button>
            </div>
            <button class="btn" id="download" title="Download">⬇</button>
            <button class="btn" id="close" title="Close">✕</button>
          </div>
        </div>
        
        <div class="content">
          <button class="navigation-arrow left" id="prev-btn" style="display: none;">‹</button>
          <button class="navigation-arrow right" id="next-btn" style="display: none;">›</button>
          <div id="file-content"></div>
        </div>
        
        <div class="thumbnail-nav" id="thumbnail-nav" style="display: none;">
          <div class="thumbnail-container" id="thumbnail-container"></div>
        </div>
      </div>

      <script>
        const attachments = ${JSON.stringify(attachments)};
        let currentIndex = ${initialIndex};
        let imageZoom = 1;
        let imageRotation = 0;

        function getFileIcon(type) {
          if (type.startsWith('image/')) return '🖼️';
          if (type.startsWith('video/')) return '🎥';
          if (type.startsWith('audio/')) return '🎵';
          if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return '📦';
          if (type.includes('pdf') || type.includes('document')) return '📄';
          return '📎';
        }

        function formatFileSize(bytes) {
          if (bytes === 0) return '0 Bytes';
          const k = 1024;
          const sizes = ['Bytes', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        function formatDate(date) {
          return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }

        function updateDisplay() {
          const attachment = attachments[currentIndex];
          if (!attachment) return;

          // Update header
          document.getElementById('file-icon').textContent = getFileIcon(attachment.type);
          document.getElementById('file-name').textContent = attachment.name;
          document.getElementById('file-info').textContent = \`\${formatFileSize(attachment.size)} • \${formatDate(attachment.uploadedAt)}\`;
          document.getElementById('file-counter').textContent = \`\${currentIndex + 1} of \${attachments.length}\`;

          // Update content
          const content = document.getElementById('file-content');
          const isImage = attachment.type.startsWith('image/');
          const isVideo = attachment.type.startsWith('video/');
          const isAudio = attachment.type.startsWith('audio/');

          // Show/hide image controls
          document.getElementById('image-controls').style.display = isImage ? 'flex' : 'none';

          if (isImage) {
            content.innerHTML = \`
              <div class="image-container">
                <img src="\${attachment.url}" alt="\${attachment.name}" 
                     style="transform: scale(\${imageZoom}) rotate(\${imageRotation}deg);">
              </div>
            \`;
          } else if (isVideo) {
            content.innerHTML = \`
              <video src="\${attachment.url}" controls autoplay style="max-width: 100%; max-height: 100%;">
                Your browser does not support the video tag.
              </video>
            \`;
          } else if (isAudio) {
            content.innerHTML = \`
              <div class="file-info">
                <div class="file-icon">🎵</div>
                <audio src="\${attachment.url}" controls autoplay style="width: 100%; max-width: 400px;">
                  Your browser does not support the audio tag.
                </audio>
              </div>
            \`;
          } else {
            content.innerHTML = \`
              <div class="file-info">
                <div class="file-icon">\${getFileIcon(attachment.type)}</div>
                <div>
                  <p style="font-size: 1.125rem; font-weight: 500; margin: 0 0 0.5rem 0;">\${attachment.name}</p>
                  <p style="font-size: 0.875rem; color: #6b7280; margin: 0;">\${formatFileSize(attachment.size)}</p>
                </div>
                <div class="file-actions">
                  <button class="action-btn" onclick="window.open('\${attachment.url}', '_blank')">
                    👁️ Open in New Tab
                  </button>
                  <button class="action-btn primary" onclick="downloadFile('\${attachment.url}', '\${attachment.name}')">
                    ⬇ Download
                  </button>
                </div>
              </div>
            \`;
          }

          // Update navigation
          const canNavigate = attachments.length > 1;
          document.getElementById('prev-btn').style.display = canNavigate ? 'block' : 'none';
          document.getElementById('next-btn').style.display = canNavigate ? 'block' : 'none';
          document.getElementById('thumbnail-nav').style.display = canNavigate ? 'block' : 'none';

          // Update thumbnails
          if (canNavigate) {
            const container = document.getElementById('thumbnail-container');
            container.innerHTML = attachments.map((att, index) => \`
              <div class="thumbnail \${index === currentIndex ? 'active' : ''}" 
                   onclick="goToIndex(\${index})" 
                   style="cursor: pointer;">
                \${att.type.startsWith('image/') 
                  ? \`<img src="\${att.url}" alt="\${att.name}">\`
                  : \`<div class="thumbnail-icon">\${getFileIcon(att.type)}</div>\`
                }
              </div>
            \`).join('');
          }
        }

        function goToIndex(index) {
          currentIndex = index;
          imageZoom = 1;
          imageRotation = 0;
          updateDisplay();
        }

        function nextFile() {
          currentIndex = (currentIndex + 1) % attachments.length;
          imageZoom = 1;
          imageRotation = 0;
          updateDisplay();
        }

        function prevFile() {
          currentIndex = currentIndex > 0 ? currentIndex - 1 : attachments.length - 1;
          imageZoom = 1;
          imageRotation = 0;
          updateDisplay();
        }

        function downloadFile(url, filename) {
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        function handleKeyDown(e) {
          switch (e.key) {
            case 'Escape':
              window.close();
              break;
            case 'ArrowLeft':
              prevFile();
              break;
            case 'ArrowRight':
              nextFile();
              break;
          }
        }

        // Event listeners
        document.addEventListener('keydown', handleKeyDown);
        document.getElementById('prev-btn').addEventListener('click', prevFile);
        document.getElementById('next-btn').addEventListener('click', nextFile);
        document.getElementById('close').addEventListener('click', () => window.close());
        document.getElementById('download').addEventListener('click', () => {
          const attachment = attachments[currentIndex];
          downloadFile(attachment.url, attachment.name);
        });

        // Image controls
        document.getElementById('zoom-out').addEventListener('click', () => {
          imageZoom = Math.max(0.5, imageZoom - 0.25);
          updateDisplay();
        });

        document.getElementById('zoom-in').addEventListener('click', () => {
          imageZoom = Math.min(3, imageZoom + 0.25);
          updateDisplay();
        });

        document.getElementById('rotate').addEventListener('click', () => {
          imageRotation = (imageRotation + 90) % 360;
          updateDisplay();
        });

        // Initialize display
        updateDisplay();

        // Focus the window
        window.focus();
      </script>
    </body>
    </html>
  `;

  viewerWindow.document.write(htmlContent);
  viewerWindow.document.close();

  return viewerWindow;
};
