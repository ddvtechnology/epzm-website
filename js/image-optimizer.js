/**
 * Escola Presbiteriana Zenaide Magalhães
 * Otimizador de imagens no navegador (HTML5 Canvas -> WebP/JPEG) + helpers de Storage do Supabase.
 */

(function () {
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_INPUT_BYTES = 15 * 1024 * 1024; // 15 MB antes da compressão

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function supportsWebP() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/webp').startsWith('data:image/webp');
    } catch (_) {
      return false;
    }
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Não foi possível ler o arquivo de imagem selecionado.'));
      };
      img.src = url;
    });
  }

  function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Falha ao comprimir a imagem no navegador.'));
        },
        mimeType,
        quality
      );
    });
  }

  /**
   * Valida, redimensiona e comprime uma imagem no cliente.
   * @param {File} file
   * @param {{ maxWidth?: number, maxHeight?: number, quality?: number }} options
   */
  async function compressImage(file, options = {}) {
    if (!file) {
      throw new Error('Nenhum arquivo selecionado.');
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Formato não suportado. Use JPG, PNG ou WebP.');
    }
    if (file.size > MAX_INPUT_BYTES) {
      throw new Error('A imagem ultrapassa o limite máximo de 15 MB.');
    }

    const maxWidth = options.maxWidth || 1600;
    const maxHeight = options.maxHeight || 1600;
    const quality = typeof options.quality === 'number' ? options.quality : 0.82;

    const img = await loadImageFromFile(file);
    let targetW = img.naturalWidth || img.width;
    let targetH = img.naturalHeight || img.height;

    const ratio = Math.min(maxWidth / targetW, maxHeight / targetH, 1);
    targetW = Math.max(1, Math.round(targetW * ratio));
    targetH = Math.max(1, Math.round(targetH * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const outputMime = supportsWebP() ? 'image/webp' : 'image/jpeg';
    const extension = outputMime === 'image/webp' ? 'webp' : 'jpg';
    const blob = await canvasToBlob(canvas, outputMime, quality);

    return {
      blob,
      mimeType: outputMime,
      extension,
      originalSize: file.size,
      compressedSize: blob.size,
      width: targetW,
      height: targetH,
    };
  }

  function generateSafePath(folder, extension) {
    const cleanFolder = String(folder || 'geral').replace(/[^a-z0-9/_-]/gi, '');
    const randomPart =
      window.crypto && typeof window.crypto.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : String(Date.now()) + '-' + Math.random().toString(36).slice(2, 10);
    return `${cleanFolder}/${Date.now()}-${randomPart}.${extension}`;
  }

  /**
   * Comprime e envia uma imagem para o bucket do Supabase Storage.
   * @param {File} file
   * @param {{ folder: string, maxWidth?: number, maxHeight?: number, quality?: number }} options
   */
  async function uploadCompressedImage(file, options) {
    const client = window.epzmSupabase;
    const bucket = (window.EPZM_SUPABASE_CONFIG && window.EPZM_SUPABASE_CONFIG.storageBucket) || 'midias-site';

    if (!client) {
      throw new Error('Cliente Supabase não configurado.');
    }

    const compressed = await compressImage(file, options);
    const path = generateSafePath(options.folder, compressed.extension);

    const { error } = await client.storage.from(bucket).upload(path, compressed.blob, {
      contentType: compressed.mimeType,
      cacheControl: '31536000',
      upsert: false,
    });

    if (error) {
      throw new Error('Erro ao enviar imagem para o Storage: ' + error.message);
    }

    const { data: publicData } = client.storage.from(bucket).getPublicUrl(path);

    return {
      publicUrl: publicData.publicUrl,
      path,
      originalSize: compressed.originalSize,
      compressedSize: compressed.compressedSize,
      width: compressed.width,
      height: compressed.height,
    };
  }

  /**
   * Remove um arquivo antigo do Storage (ignora silenciosamente se o caminho for nulo/vazio).
   */
  async function deleteStorageImage(path) {
    if (!path || !window.epzmSupabase) return;
    const bucket = (window.EPZM_SUPABASE_CONFIG && window.EPZM_SUPABASE_CONFIG.storageBucket) || 'midias-site';
    try {
      await window.epzmSupabase.storage.from(bucket).remove([path]);
    } catch (_) {
      // Limpeza best-effort para não bloquear o fluxo principal
    }
  }

  window.epzmImageTools = {
    compressImage,
    uploadCompressedImage,
    deleteStorageImage,
    formatBytes,
  };
})();
