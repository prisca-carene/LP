const express = require('express');
const path = require('path');
const fs = require('fs');
const slugify = require('slugify');
const multer = require('multer');
const { generateLandingPageContent, generateFromSeoData } = require('./services/openai');
const { scrapeUrl } = require('./services/scraper');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration de Multer pour l'upload d'images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Le fichier doit être une image'));
    }
  }
});

// Configuration
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/tinymce', express.static(path.join(__dirname, '../node_modules/tinymce')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '50mb' }));

// Routes
app.get('/', (req, res) => {
  res.redirect('/admin');
});

app.get('/admin', (req, res) => {
  const landingPages = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data', 'landing-pages.json'), 'utf8')
  );
  res.render('admin', { landingPages });
});

app.get('/admin/create', (req, res) => {
  const defaultColors = {
    primary: '#f97316',
    secondary: '#ea580c',
    accent: '#fb923c'
  };
  res.render('create', { errors: {}, colors: defaultColors });
});

app.post('/admin/create-from-url', async (req, res) => {
  try {
    const { url, videoUrl } = req.body;

    if (!url) {
      return res.status(400).json({ errors: { url: 'L\'URL est requise' } });
    }

    const seoData = await scrapeUrl(url);
    const generatedContent = await generateFromSeoData(seoData);

    const title = seoData.title;
    const slug = slugify(title, { lower: true, strict: true });

    const colors = {
      primary: '#1279fd',
      secondary: '#0e63d1',
      accent: '#3b82f6'
    };

    const sections = [
      {
        type: 'hero',
        title: title,
        content: generatedContent.hero.content,
        videoUrl: videoUrl || 'https://www.youtube.com/watch?v=default'
      },
      {
        type: 'video',
        title: 'A propos',
        content: generatedContent.video.content,
        imageUrl: seoData.mainImage
      },
      {
        type: 'features',
        content: generatedContent.features.intro,
        features: generatedContent.features.items
      },
      {
        type: 'conclusion',
        content: generatedContent.conclusion.content
      }
    ];

    const landingPages = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data', 'landing-pages.json'), 'utf8')
    );

    const newPage = {
      id: Date.now().toString(),
      title: title,
      slug: slug,
      sections: sections,
      colors: colors,
      createdAt: new Date().toISOString()
    };

    landingPages.push(newPage);
    fs.writeFileSync(
      path.join(__dirname, 'data', 'landing-pages.json'),
      JSON.stringify(landingPages, null, 2)
    );

    res.json({ success: true, redirect: '/admin' });
  } catch (error) {
    console.error('Erreur lors de la création depuis URL:', error);
    res.status(500).json({
      errors: {
        general: 'Erreur lors de la création de la page',
        details: error.message
      }
    });
  }
});

app.post('/admin/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucune image n\'a été uploadée' });
  }
  res.json({
    location: `/uploads/${req.file.filename}`,
    message: 'Image uploadée avec succès'
  });
});

app.post('/admin/regenerate-content', async (req, res) => {
  try {
    const { type, title } = req.body;
    const generatedContent = await generateLandingPageContent(title);

    let content = '';
    switch (type) {
      case 'hero-content':
        content = generatedContent.hero.content;
        break;
      case 'video-description':
        content = generatedContent.video.content;
        break;
      case 'features-intro':
        content = generatedContent.features.intro;
        break;
      case 'feature-description':
        const randomFeature =
          generatedContent.features.items[
            Math.floor(Math.random() * generatedContent.features.items.length)
          ];
        content = randomFeature.description;
        break;
      case 'conclusion':
        content = generatedContent.conclusion.content;
        break;
      default:
        return res.status(400).json({
          error: 'Type de contenu invalide',
          message: `Le type "${type}" n'est pas reconnu. Types valides: hero-content, video-description, features-intro, feature-description, conclusion`
        });
    }

    if (!content) {
      return res.status(500).json({
        error: 'Erreur de génération',
        message: 'Le contenu n\'a pas pu être généré'
      });
    }

    res.json({ content });
  } catch (error) {
    console.error('Erreur lors de la régénération du contenu:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Erreur lors de la régénération du contenu'
    });
  }
});

app.post('/admin/create-with-ai', upload.single('heroImage'), async (req, res) => {
  try {
    const errors = {};
    if (!req.body.title || req.body.title.trim() === '') {
      errors.title = 'Le titre est requis';
    }
    if (!req.file) {
      errors.heroImage = 'L\'image hero est requise';
    }
    if (!req.body.videoUrl || !req.body.videoUrl.trim()) {
      errors.videoUrl = 'L\'URL de la vidéo est requise';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    const title = req.body.title.trim();
    const slug = slugify(title, { lower: true, strict: true });
    const imageUrl = `/uploads/${req.file.filename}`;
    const videoUrl = req.body.videoUrl.trim();

    const generatedContent = await generateLandingPageContent(title);

    let colors = {};
    try {
      colors = typeof req.body.colors === 'string'
        ? JSON.parse(req.body.colors)
        : req.body.colors || {};
    } catch (e) {
      console.error('Erreur parsing colors:', e);
      colors = {
        primary: '#f97316',
        secondary: '#ea580c',
        accent: '#fb923c'
      };
    }

    const sections = [
      {
        type: 'hero',
        title: title,
        content: generatedContent.hero.content,
        videoUrl: videoUrl
      },
      {
        type: 'video',
        title: 'A propos',
        content: generatedContent.video.content,
        imageUrl: imageUrl
      },
      {
        type: 'features',
        content: generatedContent.features.intro,
        features: generatedContent.features.items
      },
      {
        type: 'conclusion',
        content: generatedContent.conclusion.content
      }
    ];

    const landingPages = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data', 'landing-pages.json'), 'utf8')
    );

    const newPage = {
      id: Date.now().toString(),
      title: title,
      slug: slug,
      sections: sections,
      colors: colors,
      createdAt: new Date().toISOString()
    };

    landingPages.push(newPage);
    fs.writeFileSync(
      path.join(__dirname, 'data', 'landing-pages.json'),
      JSON.stringify(landingPages, null, 2)
    );

    res.json({ success: true, redirect: '/admin' });
  } catch (error) {
    console.error('Erreur lors de la création avec l\'IA:', error);
    res.status(500).json({ errors: { general: 'Erreur lors de la génération de la page' } });
  }
});

app.post('/admin/create', async (req, res) => {
  try {
    const errors = {};
    if (!req.body.title || req.body.title.trim() === '') {
      errors.title = 'Le titre est requis';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    const landingPages = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data', 'landing-pages.json'), 'utf8')
    );

    const title = req.body.title.trim();
    const slug = req.body.slug
      ? req.body.slug.trim()
      : slugify(title, { lower: true, strict: true });

    let sections = [];
    try {
      sections = typeof req.body.sections === 'string'
        ? JSON.parse(req.body.sections)
        : req.body.sections || [];
    } catch (e) {
      console.error('Erreur parsing sections:', e);
      return res.status(400).json({ errors: { sections: 'Format des sections invalide' } });
    }

    let colors = {};
    try {
      colors = typeof req.body.colors === 'string'
        ? JSON.parse(req.body.colors)
        : req.body.colors || {};
    } catch (e) {
      console.error('Erreur parsing colors:', e);
      colors = {
        primary: '#f97316',
        secondary: '#ea580c',
        accent: '#fb923c'
      };
    }

    const newPage = {
      id: Date.now().toString(),
      title: title,
      slug: slug,
      sections: sections,
      colors: colors,
      createdAt: new Date().toISOString()
    };

    landingPages.push(newPage);
    fs.writeFileSync(
      path.join(__dirname, 'data', 'landing-pages.json'),
      JSON.stringify(landingPages, null, 2)
    );

    res.json({ success: true, redirect: '/admin' });
  } catch (error) {
    console.error('Erreur lors de la création:', error);
    res.status(500).json({ errors: { general: 'Erreur lors de la création de la page' } });
  }
});

app.get('/admin/edit/:id', (req, res) => {
  const landingPages = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data', 'landing-pages.json'), 'utf8')
  );
  const page = landingPages.find(p => p.id === req.params.id);

  if (!page) {
    return res.status(404).send('Page non trouvée');
  }

  // Default colors if not set
  const defaultColors = {
    primary: '#f97316',
    secondary: '#ea580c',
    accent: '#fb923c'
  };

  // Lister tous les fichiers images dans public/uploads
  const uploadsDir = path.join(__dirname, 'public', 'uploads');
  let imagesList = [];
  try {
    imagesList = fs
      .readdirSync(uploadsDir)
      .filter(fn => /\.(jpe?g|png|gif|webp)$/i.test(fn))
      .map(fn => `/uploads/${fn}`);
  } catch (err) {
    console.error('Impossible de lire public/uploads :', err);
  }

  res.render('edit', {
    page,
    colors: page.colors || defaultColors,
    imagesList,
    errors: {}
  });
});

// APRÈS (avec Multer pour récupérer les fichiers et les champs textuels)
app.post(
  '/admin/edit/:id',
  upload.fields([
    { name: 'heroImage', maxCount: 1 },
    { name: 'image', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const errors = {};
      if (!req.body.title || !req.body.title.trim()) {
        errors.title = 'Le titre est requis';
      }
      if (Object.keys(errors).length) {
        return res.status(400).json({ errors });
      }

      const landingPages = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'data', 'landing-pages.json'), 'utf8')
      );
      const pageIndex = landingPages.findIndex(p => p.id === req.params.id);
      if (pageIndex === -1) {
        return res.status(404).json({ errors: { general: 'Page non trouvée' } });
      }

      // Récupération des champs
      const title = req.body.title.trim();
      const slug = req.body.slug?.trim() || slugify(title, { lower: true, strict: true });
      let sections, colors;
      try {
        sections = JSON.parse(req.body.sections);
      } catch {
        return res.status(400).json({ errors: { sections: 'Format des sections invalide' } });
      }
      try {
        colors = JSON.parse(req.body.colors);
      } catch {
        colors = landingPages[pageIndex].colors;
      }

      // Mise à jour des URL d’images si un nouveau fichier a été uploadé
      if (req.files.image) {
        const file = req.files.image[0];
        sections = sections.map(sec =>
          sec.type !== 'hero' ? { ...sec, imageUrl: `/uploads/${file.filename}` } : sec
        );
      }

      const updatedPage = {
        ...landingPages[pageIndex],
        title,
        slug,
        sections,
        colors,
        updatedAt: new Date().toISOString()
      };

      landingPages[pageIndex] = updatedPage;
      fs.writeFileSync(
        path.join(__dirname, 'data', 'landing-pages.json'),
        JSON.stringify(landingPages, null, 2)
      );

      res.json({ success: true, redirect: '/admin' });
    } catch (err) {
      console.error('Erreur lors de la modification:', err);
      res.status(500).json({ errors: { general: 'Erreur lors de la modification de la page' } });
    }
  }
);

app.get('/admin/preview/:id', (req, res) => {
  const landingPages = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data', 'landing-pages.json'), 'utf8')
  );
  const page = landingPages.find(p => p.id === req.params.id);

  if (!page) {
    return res.status(404).send('Page non trouvée');
  }

  res.render('landing', { page });
});

app.delete('/admin/delete/:id', (req, res) => {
  try {
    const landingPages = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data', 'landing-pages.json'), 'utf8')
    );
    const pageIndex = landingPages.findIndex(p => p.id === req.params.id);

    if (pageIndex === -1) {
      return res.status(404).json({ error: 'Page non trouvée' });
    }

    landingPages.splice(pageIndex, 1);
    fs.writeFileSync(
      path.join(__dirname, 'data', 'landing-pages.json'),
      JSON.stringify(landingPages, null, 2)
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la page' });
  }
});

app.get('/lp/:slug', (req, res) => {
  const landingPages = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data', 'landing-pages.json'), 'utf8')
  );
  const page = landingPages.find(p => p.slug === req.params.slug);

  if (!page) {
    return res.status(404).render('404');
  }

  res.render('landing', { page });
});

// Création du dossier data et du fichier JSON initial si nécessaire
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'landing-pages.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify([], null, 2));
}

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
