/**
 * ImageCompressor - Core Application Logic
 * 100% Client-Side Canvas Image Compression Engine
 */

(function () {
  'use strict';

  // --- State ---
  const state = {
    originalFile: null,
    originalImage: null,
    originalName: '',
    originalWidth: 0,
    originalHeight: 0,
    originalSize: 0,
    originalType: 'image/jpeg',
    
    // Compression parameters
    preset: 'balanced', // 'balanced', 'max', 'high', 'custom'
    quality: 0.75, // default balanced 75%
    maxDimension: 0, // 0 = keep original, 1920, 1280, 800
    targetFormat: 'auto', // 'auto', 'image/webp', 'image/jpeg', 'image/png'

    // Result
    compressedBlob: null,
    compressedBlobUrl: null,
    compressedSize: 0,
    targetWidth: 0,
    targetHeight: 0,
  };

  // --- DOM Elements ---
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const chooseFileBtn = document.getElementById('chooseFileBtn');
  const editorWorkspace = document.getElementById('editorWorkspace');
  const infoThumb = document.getElementById('infoThumb');
  const infoFileName = document.getElementById('infoFileName');
  const infoOriginalDim = document.getElementById('infoOriginalDim');
  const infoOriginalSize = document.getElementById('infoOriginalSize');
  const infoOriginalType = document.getElementById('infoOriginalType');
  const changeImageBtn = document.getElementById('changeImageBtn');

  // Compression Controls
  const presetButtons = document.querySelectorAll('.compression-preset-btn');
  const qualitySlider = document.getElementById('qualitySlider');
  const qualityVal = document.getElementById('qualityVal');
  const qualityNote = document.getElementById('qualityNote');
  const maxDimensionSelect = document.getElementById('maxDimensionSelect');
  const formatButtons = document.querySelectorAll('.format-btn');

  // Action Buttons
  const resetBtn = document.getElementById('resetBtn');
  const compressBtn = document.getElementById('compressBtn');
  const downloadBtn = document.getElementById('downloadBtn');

  // Previews
  const canvasPreview = document.getElementById('canvasPreview');
  const previewDimTag = document.getElementById('previewDimTag');
  const comparisonSection = document.getElementById('comparisonSection');
  const compBeforeImg = document.getElementById('compBeforeImg');
  const compAfterImg = document.getElementById('compAfterImg');
  const compBeforeDim = document.getElementById('compBeforeDim');
  const compBeforeSize = document.getElementById('compBeforeSize');
  const compAfterDim = document.getElementById('compAfterDim');
  const compAfterSize = document.getElementById('compAfterSize');
  const compSavingsChip = document.getElementById('compSavingsChip');
  const compDownloadBtn = document.getElementById('compDownloadBtn');

  // Navigation & Accordions
  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
  const faqItems = document.querySelectorAll('.faq-item');
  const toastContainer = document.getElementById('toastContainer');
  const header = document.querySelector('.header');

  // --- Utility Functions ---
  function formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function getReadableFormat(mime) {
    if (mime === 'image/jpeg') return 'JPG';
    if (mime === 'image/png') return 'PNG';
    if (mime === 'image/webp') return 'WEBP';
    return 'IMAGE';
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    } else {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.innerHTML = `${iconSvg} <span>${message}</span>`;
    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentElement) toast.remove();
      }, 300);
    }, 3500);
  }

  // --- Image Handling & File Reader ---
  function handleFile(file) {
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Please select a valid JPG, PNG, or WEBP image.', 'error');
      return;
    }

    // Safety limit (e.g. 50MB)
    if (file.size > 50 * 1024 * 1024) {
      showToast('Image file size is over 50MB. This might cause browser memory limits.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        // Populate state
        state.originalFile = file;
        state.originalImage = img;
        state.originalName = file.name;
        state.originalWidth = img.naturalWidth;
        state.originalHeight = img.naturalHeight;
        state.originalSize = file.size;
        state.originalType = file.type;

        // Default compression configuration
        applyPreset('balanced');
        setTargetFormat('auto');

        // Update Editor UI
        setupEditorUI();
        showToast('Image loaded successfully! Ready to compress.', 'success');

        // Automatically trigger initial compression for instant preview
        executeCompression();
      };

      img.onerror = function () {
        showToast('Failed to load image file. Please try another image.', 'error');
      };

      img.src = e.target.result;
    };

    reader.onerror = function () {
      showToast('Error reading image file.', 'error');
    };

    reader.readAsDataURL(file);
  }

  function setupEditorUI() {
    // Hide dropzone & show editor workspace
    dropzone.style.display = 'none';
    editorWorkspace.classList.add('active');

    // Populate Image Info Bar
    infoThumb.src = state.originalImage.src;
    infoFileName.textContent = state.originalName;
    infoFileName.title = state.originalName;
    infoOriginalDim.textContent = `${state.originalWidth} × ${state.originalHeight} px`;
    infoOriginalSize.textContent = formatBytes(state.originalSize);
    infoOriginalType.textContent = getReadableFormat(state.originalType);

    // Canvas preview
    canvasPreview.src = state.originalImage.src;
    previewDimTag.textContent = `${state.originalWidth} × ${state.originalHeight} px`;

    // Reset comparison view until compressed
    comparisonSection.classList.remove('active');
  }

  // --- Compression Presets Handling ---
  function applyPreset(presetKey) {
    state.preset = presetKey;
    presetButtons.forEach((btn) => {
      if (btn.getAttribute('data-preset') === presetKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (presetKey === 'balanced') {
      state.quality = 0.75;
      qualitySlider.value = 75;
      qualityVal.textContent = '75%';
      qualityNote.textContent = 'Optimal balance between high byte savings and pristine clarity';
    } else if (presetKey === 'max') {
      state.quality = 0.45;
      qualitySlider.value = 45;
      qualityVal.textContent = '45%';
      qualityNote.textContent = 'Aggressive reduction for minimum file size and fastest web loading';
    } else if (presetKey === 'high') {
      state.quality = 0.90;
      qualitySlider.value = 90;
      qualityVal.textContent = '90%';
      qualityNote.textContent = 'Near-lossless visual fidelity with moderate file size reduction';
    } else if (presetKey === 'custom') {
      qualityNote.textContent = 'Manually adjust the slider to fine-tune quality vs file size';
    }
  }

  presetButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const pKey = btn.getAttribute('data-preset');
      applyPreset(pKey);
      executeCompression();
    });
  });

  // Quality Slider Input
  qualitySlider.addEventListener('input', () => {
    const val = parseInt(qualitySlider.value, 10);
    state.quality = val / 100;
    qualityVal.textContent = `${val}%`;

    // Set active preset to custom if manually sliding
    if (state.preset !== 'custom') {
      state.preset = 'custom';
      presetButtons.forEach((b) => {
        if (b.getAttribute('data-preset') === 'custom') b.classList.add('active');
        else b.classList.remove('active');
      });
      qualityNote.textContent = 'Custom compression level selected';
    }
  });

  // Automatically compress when user releases the slider
  qualitySlider.addEventListener('change', () => {
    executeCompression();
  });

  // Max Dimension Select
  maxDimensionSelect.addEventListener('change', () => {
    state.maxDimension = parseInt(maxDimensionSelect.value, 10) || 0;
    executeCompression();
  });

  // Target Format Switcher
  function setTargetFormat(fmt) {
    state.targetFormat = fmt;
    formatButtons.forEach((btn) => {
      if (btn.getAttribute('data-format') === fmt) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  formatButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const fmt = btn.getAttribute('data-format');
      setTargetFormat(fmt);
      executeCompression();
    });
  });

  // --- Dimension Downscaling Calculator ---
  function computeTargetDimensions(origW, origH, maxDim) {
    if (!maxDim || maxDim <= 0) {
      return { width: origW, height: origH };
    }

    if (origW <= maxDim && origH <= maxDim) {
      return { width: origW, height: origH };
    }

    let targetW, targetH;
    if (origW >= origH) {
      targetW = maxDim;
      targetH = Math.max(1, Math.round((origH * maxDim) / origW));
    } else {
      targetH = maxDim;
      targetW = Math.max(1, Math.round((origW * maxDim) / origH));
    }
    return { width: targetW, height: targetH };
  }

  // --- Determine Output MIME Type ---
  function determineOutputMime() {
    if (state.targetFormat === 'image/webp') return 'image/webp';
    if (state.targetFormat === 'image/jpeg') return 'image/jpeg';
    if (state.targetFormat === 'image/png') return 'image/png';

    // Auto mode:
    // If source is PNG, WebP offers superior compression while preserving transparency.
    // If browser supports WebP (standard everywhere in 2026), compress as WebP if quality < 0.95 for maximum compression.
    if (state.originalType === 'image/png' && state.quality < 0.98) {
      return 'image/webp';
    }
    return state.originalType || 'image/jpeg';
  }

  // --- Compression Engine ---
  function executeCompression(callback) {
    if (!state.originalImage) {
      showToast('Please upload an image first.', 'error');
      return;
    }

    const { width: targetW, height: targetH } = computeTargetDimensions(
      state.originalWidth,
      state.originalHeight,
      state.maxDimension
    );

    state.targetWidth = targetW;
    state.targetHeight = targetH;
    previewDimTag.textContent = `${targetW} × ${targetH} px`;

    // Button loading state
    compressBtn.disabled = true;
    const origBtnHtml = compressBtn.innerHTML;
    compressBtn.innerHTML = `
      <svg class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-linecap="round"/>
      </svg>
      Compressing...
    `;

    setTimeout(() => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const outputMime = determineOutputMime();

        // If target is JPEG, fill white background for transparent PNG source
        if (outputMime === 'image/jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetW, targetH);
        }

        ctx.drawImage(state.originalImage, 0, 0, targetW, targetH);

        canvas.toBlob(
          (blob) => {
            compressBtn.disabled = false;
            compressBtn.innerHTML = origBtnHtml;

            if (!blob) {
              showToast('Error generating compressed image.', 'error');
              return;
            }

            // Cleanup old blob URL
            if (state.compressedBlobUrl) {
              URL.revokeObjectURL(state.compressedBlobUrl);
            }

            state.compressedBlob = blob;
            state.compressedSize = blob.size;
            state.compressedBlobUrl = URL.createObjectURL(blob);

            // Update Before / After preview
            updateComparisonPreview();

            if (callback) callback();
          },
          outputMime,
          state.quality
        );
      } catch (err) {
        console.error(err);
        compressBtn.disabled = false;
        compressBtn.innerHTML = origBtnHtml;
        showToast('Error during compression: ' + err.message, 'error');
      }
    }, 40);
  }

  // --- Before / After Comparison Preview ---
  function updateComparisonPreview() {
    compBeforeImg.src = state.originalImage.src;
    compBeforeDim.textContent = `${state.originalWidth} × ${state.originalHeight} px`;
    compBeforeSize.textContent = formatBytes(state.originalSize);

    compAfterImg.src = state.compressedBlobUrl;
    compAfterDim.textContent = `${state.targetWidth} × ${state.targetHeight} px`;
    compAfterSize.textContent = formatBytes(state.compressedSize);

    // Compute savings percentage
    const sizeDiff = state.compressedSize - state.originalSize;
    const pctDiff = Math.abs(Math.round((sizeDiff / state.originalSize) * 100));

    if (sizeDiff < 0) {
      compSavingsChip.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        ${pctDiff}% Saved!
      `;
      compSavingsChip.style.background = '#ecfdf5';
      compSavingsChip.style.color = '#059669';
    } else if (sizeDiff > 0) {
      compSavingsChip.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
        +${pctDiff}%
      `;
      compSavingsChip.style.background = '#fef3c7';
      compSavingsChip.style.color = '#d97706';
    } else {
      compSavingsChip.innerHTML = 'Same Size';
      compSavingsChip.style.background = '#f1f5f9';
      compSavingsChip.style.color = '#475569';
    }

    comparisonSection.classList.add('active');
  }

  // --- Download Trigger ---
  function triggerDownload() {
    if (!state.compressedBlob || !state.compressedBlobUrl) {
      executeCompression(() => {
        initiateFileSave();
      });
      return;
    }
    initiateFileSave();
  }

  function initiateFileSave() {
    if (!state.compressedBlobUrl) return;

    // Generate output extension based on actual blob type
    const outputMime = state.compressedBlob.type;
    let ext = 'jpg';
    if (outputMime === 'image/webp') ext = 'webp';
    else if (outputMime === 'image/png') ext = 'png';
    else if (outputMime === 'image/jpeg') ext = 'jpg';

    const baseName = state.originalName.substring(0, state.originalName.lastIndexOf('.')) || 'image';
    const outputName = `${baseName}-compressed.${ext}`;

    const a = document.createElement('a');
    a.href = state.compressedBlobUrl;
    a.download = outputName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showToast(`Downloaded: ${outputName} (${formatBytes(state.compressedSize)})`, 'success');
  }

  // --- Reset Tool ---
  function resetTool() {
    if (state.compressedBlobUrl) {
      URL.revokeObjectURL(state.compressedBlobUrl);
    }
    state.originalFile = null;
    state.originalImage = null;
    state.originalName = '';
    state.originalWidth = 0;
    state.originalHeight = 0;
    state.originalSize = 0;
    state.compressedBlob = null;
    state.compressedBlobUrl = null;
    state.compressedSize = 0;

    fileInput.value = '';
    canvasPreview.src = '';
    infoThumb.src = '';
    compBeforeImg.src = '';
    compAfterImg.src = '';
    applyPreset('balanced');
    setTargetFormat('auto');
    maxDimensionSelect.value = '0';

    editorWorkspace.classList.remove('active');
    comparisonSection.classList.remove('active');
    dropzone.style.display = 'flex';
    showToast('Workspace reset.', 'info');
  }

  // --- Event Listeners ---

  // Upload Area triggers
  dropzone.addEventListener('click', (e) => {
    if (e.target !== chooseFileBtn) {
      fileInput.click();
    }
  });

  chooseFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  });

  // Drag & Drop
  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(
      eventName,
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      },
      false
    );
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(
      eventName,
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      },
      false
    );
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files[0]) {
      handleFile(dt.files[0]);
    }
  });

  // Clipboard Paste Support (Ctrl+V / Cmd+V)
  window.addEventListener('paste', (e) => {
    const items = (e.clipboardData || window.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleFile(file);
          showToast('Image pasted from clipboard!', 'success');
          break;
        }
      }
    }
  });

  // Action Buttons
  changeImageBtn.addEventListener('click', () => {
    fileInput.click();
  });

  resetBtn.addEventListener('click', resetTool);
  compressBtn.addEventListener('click', () => {
    executeCompression(() => {
      showToast('Image compressed successfully!', 'success');
      setTimeout(() => {
        comparisonSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    });
  });

  downloadBtn.addEventListener('click', triggerDownload);
  compDownloadBtn.addEventListener('click', triggerDownload);

  // --- FAQ Accordion ---
  faqItems.forEach((item) => {
    const questionBtn = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    questionBtn.addEventListener('click', () => {
      const isOpen = item.classList.contains('active');

      // Close all other accordions for clean UX
      faqItems.forEach((other) => {
        if (other !== item) {
          other.classList.remove('active');
          const otherAns = other.querySelector('.faq-answer');
          if (otherAns) otherAns.style.maxHeight = null;
        }
      });

      if (!isOpen) {
        item.classList.add('active');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      } else {
        item.classList.remove('active');
        answer.style.maxHeight = null;
      }
    });
  });

  // Open first FAQ item by default
  if (faqItems.length > 0) {
    const firstItem = faqItems[0];
    const firstAns = firstItem.querySelector('.faq-answer');
    firstItem.classList.add('active');
    if (firstAns) firstAns.style.maxHeight = firstAns.scrollHeight + 'px';
  }

  // --- Mobile Navigation Drawer ---
  menuToggle.addEventListener('click', () => {
    const isOpen = menuToggle.classList.toggle('open');
    mobileMenu.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  mobileNavLinks.forEach((link) => {
    link.addEventListener('click', () => {
      menuToggle.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // Sticky Header Effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // Handle animation for CSS spinner
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .spin {
      animation: spin 0.8s linear infinite;
    }
  `;
  document.head.appendChild(style);

})();
