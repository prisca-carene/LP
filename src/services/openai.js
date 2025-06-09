const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateLandingPageContent(title) {
  const systemPrompt = `Tu es un expert en copywriting et marketing digital spécialisé dans la création de landing pages impactantes et orientées conversion.
  Ton objectif est de créer du contenu persuasif et engageant en français pour une landing page d'animations événementielles.
  Utilise un ton direct, professionnel et convaincant. Mets l'accent sur la valeur ajoutée et les bénéfices client.
  Le contenu doit être cohérent avec le titre suivant: "${title}"`;

  try {
    const [heroResponse, videoDescResponse, featuresIntroResponse, feature1Response, feature2Response, feature3Response, conclusionResponse] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Génère un texte accrocheur de 50 mots maximum pour la section hero qui présente le concept et donne envie d'en savoir plus." }
        ],
        max_tokens: 150,
        temperature: 0.7
      }),
      openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Génère une description engageante de 100 mots maximum qui approfondit le concept et met en avant les points forts du service." }
        ],
        max_tokens: 200,
        temperature: 0.7
      }),
      openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Génère une introduction concise de 40 mots maximum pour présenter les animations événementielles." }
        ],
        max_tokens: 100,
        temperature: 0.7
      }),
      openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Génère un texte de 40 mots maximum expliquant pourquoi faire confiance à l'entreprise pour les animations événementielles." }
        ],
        max_tokens: 100,
        temperature: 0.7
      }),
      openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Génère un texte de 40 mots maximum présentant la diversité des animations proposées." }
        ],
        max_tokens: 100,
        temperature: 0.7
      }),
      openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Génère un texte de 40 mots maximum mettant en avant la personnalisation des animations selon les besoins." }
        ],
        max_tokens: 100,
        temperature: 0.7
      }),
      openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Génère une conclusion persuasive de 100 mots maximum qui pousse à l'action." }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    ]);

    return {
      hero: {
        content: heroResponse.choices[0].message.content.trim()
      },
      video: {
        content: videoDescResponse.choices[0].message.content.trim()
      },
      features: {
        intro: featuresIntroResponse.choices[0].message.content.trim(),
        items: [
          {
            title: "Pourquoi nous faire confiance ?",
            description: feature1Response.choices[0].message.content.trim()
          },
          {
            title: "Une large gamme d'animation",
            description: feature2Response.choices[0].message.content.trim()
          },
          {
            title: "Des animations sur mesure",
            description: feature3Response.choices[0].message.content.trim()
          }
        ]
      },
      conclusion: {
        content: conclusionResponse.choices[0].message.content.trim()
      }
    };
  } catch (error) {
    console.error('Erreur lors de la génération du contenu:', error);
    throw new Error('Erreur lors de la génération du contenu');
  }
}

async function generateFromSeoData(seoData) {
  const systemPrompt = `Tu es un expert en copywriting et marketing digital spécialisé dans la création de landing pages impactantes et orientées conversion.
  Analyse les données SEO suivantes et crée du contenu persuasif et engageant en français.
  Données SEO:
  - Titre: ${seoData.title}
  - Description: ${seoData.description}
  - H1: ${seoData.h1Tags.join(', ')}
  - H2: ${seoData.h2Tags.join(', ')}`;

  try {
    const [heroResponse, videoDescResponse, featuresIntroResponse, feature1Response, feature2Response, feature3Response, conclusionResponse] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Génère un texte accrocheur de 50 mots maximum pour la section hero qui présente le concept et donne envie d'en savoir plus." }
        ],
        max_tokens: 150,
        temperature: 0.7
      }),
      openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Génère une description engageante de 100 mots maximum qui approfondit le concept et met en avant les points forts du service." }
        ],
        max_tokens: 200,
        temperature: 0.7
      }),
      openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Génère une introduction concise de 40 mots maximum pour présenter les services." }
        ],
        max_tokens: 100,
        temperature: 0.7
      }),
      openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Génère un texte de 40 mots maximum expliquant pourquoi faire confiance à l'entreprise." }
        ],
        max_tokens: 100,
        temperature: 0.7
      }),
      openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Génère un texte de 40 mots maximum présentant la diversité des services." }
        ],
        max_tokens: 100,
        temperature: 0.7
      }),
      openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Génère un texte de 40 mots maximum mettant en avant la personnalisation selon les besoins." }
        ],
        max_tokens: 100,
        temperature: 0.7
      }),
      openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Génère une conclusion persuasive de 100 mots maximum qui pousse à l'action." }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    ]);

    return {
      hero: {
        content: heroResponse.choices[0].message.content.trim()
      },
      video: {
        content: videoDescResponse.choices[0].message.content.trim()
      },
      features: {
        intro: featuresIntroResponse.choices[0].message.content.trim(),
        items: [
          {
            title: "Pourquoi nous faire confiance ?",
            description: feature1Response.choices[0].message.content.trim()
          },
          {
            title: "Une large gamme de services",
            description: feature2Response.choices[0].message.content.trim()
          },
          {
            title: "Des solutions sur mesure",
            description: feature3Response.choices[0].message.content.trim()
          }
        ]
      },
      conclusion: {
        content: conclusionResponse.choices[0].message.content.trim()
      }
    };
  } catch (error) {
    console.error('Erreur lors de la génération du contenu:', error);
    throw new Error('Erreur lors de la génération du contenu');
  }
}

module.exports = { generateLandingPageContent, generateFromSeoData };