# Patrimoine Expert — Blog Patrimonial Statique

Blog de finances personnelles 100% statique (HTML/CSS/JS vanilla), prêt à déployer sur GitHub + Render.

## Structure du projet

```
patrimoine-blog/
├── assets/
│   ├── css/style.css          ← Feuille de styles complète (responsive, mobile-first)
│   └── js/main.js             ← JavaScript vanilla (cookie RGPD, menu, partage, etc.)
├── articles/                  ← 12 articles piliers
│   ├── investir-bourse-debutants.html
│   ├── assurance-vie-comparatif.html
│   ├── etf-investir.html
│   ├── credit-immobilier-negocier.html
│   ├── fiscalite-cryptomonnaies.html
│   ├── loi-pinel-2026.html
│   ├── per-plan-epargne-retraite.html
│   ├── revenus-locatifs-declaration.html
│   ├── succession-donation.html
│   ├── crowdfunding-immobilier.html
│   ├── livret-a-ldds-lep.html
│   └── devenir-rentier-dividendes.html
├── index.html
├── a-propos.html
├── contact.html
├── mentions-legales.html
├── politique-confidentialite.html
├── plan-du-site.html
├── robots.txt
├── sitemap.xml
└── README.md
```

---

## Tester en local

Aucun build requis. Ouvrez simplement `index.html` dans votre navigateur :

```bash
# Option 1 — Ouvrir directement dans le navigateur
open index.html           # macOS
start index.html          # Windows

# Option 2 — Serveur local (recommandé pour éviter les restrictions CORS)
npx serve .               # Node.js requis
# ou
python -m http.server 8080  # Python 3
```

---

## Déploiement sur GitHub + Render

### Étape 1 — Créer le dépôt GitHub

1. Connectez-vous sur [github.com](https://github.com)
2. Cliquez sur **New repository**
3. Nom : `patrimoine-expert` (ou celui de votre choix)
4. Visibilité : **Public** (requis pour les sites statiques gratuits sur Render)
5. Cliquez **Create repository**

### Étape 2 — Pousser les fichiers

```bash
cd patrimoine-blog
git init
git add .
git commit -m "Initial commit — Blog Patrimoine Expert"
git branch -M main
git remote add origin https://github.com/VOTRE-USERNAME/patrimoine-expert.git
git push -u origin main
```

### Étape 3 — Déployer sur Render

1. Rendez-vous sur [render.com](https://render.com) et créez un compte (gratuit)
2. Tableau de bord → **New** → **Static Site**
3. Connectez votre compte GitHub et sélectionnez le dépôt `patrimoine-expert`
4. Paramètres :
   - **Name** : `patrimoine-expert`
   - **Branch** : `main`
   - **Build Command** : *(laisser vide)*
   - **Publish directory** : `.`
5. Cliquez **Create Static Site**

Render déploie automatiquement. Votre site sera accessible sur une URL du type :
`https://patrimoine-expert.onrender.com`

### Étape 4 — (Optionnel) Domaine personnalisé

1. Achetez un domaine sur OVH, Ionos, Namecheap, etc. (ex : `patrimoine-expert.fr`)
2. Dans Render → votre site → **Custom Domains** → **Add Custom Domain**
3. Entrez votre domaine et suivez les instructions DNS
4. Ajoutez un enregistrement CNAME chez votre registrar :
   - Nom : `www`
   - Valeur : `patrimoine-expert.onrender.com`
5. SSL/HTTPS est activé automatiquement par Render (certificat Let's Encrypt)

---

## Configurer Google AdSense

1. Soumettez votre site à [Google AdSense](https://www.google.com/adsense/) une fois déployé
2. Attendez l'approbation (généralement 2-4 semaines)
3. Une fois approuvé, récupérez votre **ID éditeur** (format : `ca-pub-XXXXXXXXXXXXXXXXXX`)
4. Dans `assets/js/main.js`, localisez la fonction `initAdSense()` et décommentez le bloc de code
5. Remplacez `ca-pub-XXXXXXXXXXXXXXXXXX` par votre ID réel
6. Dans chaque fichier HTML, remplacez les blocs :
   ```html
   <!-- Remplacez par votre code AdSense après approbation -->
   ```
   par vos balises `<ins class="adsbygoogle">` fournies par AdSense

### Emplacements publicitaires prévus

| Classe CSS | Emplacement | Format recommandé |
|------------|-------------|-------------------|
| `.adsense-title` | Sous le titre de l'article | Responsive horizontal (728×90 ou responsive) |
| `.adsense-in-article` | Après le 2e paragraphe | In-article natif (responsive) |
| `.adsense-end` | Fin d'article | Responsive horizontal |
| `.adsense-sidebar` | Sidebar desktop | Carré/Rectangle (300×250 ou 300×600) |
| `#adAnchor` | Bannière fixe mobile | Anchor (320×50) |

---

## Configurer Formspree (formulaire de contact)

1. Créez un compte sur [formspree.io](https://formspree.io) (gratuit jusqu'à 50 soumissions/mois)
2. Créez un nouveau formulaire et copiez votre Form ID (format : `f/XXXXXXXX`)
3. Dans `contact.html` et `index.html`, remplacez :
   ```
   https://formspree.io/f/VOTRE_FORMSPREE_ID
   ```
   par votre URL réelle : `https://formspree.io/f/XXXXXXXX`

---

## SEO — Checklist post-déploiement

- [ ] Soumettre `sitemap.xml` dans [Google Search Console](https://search.google.com/search-console)
- [ ] Vérifier la propriété du site dans Search Console
- [ ] Remplacer toutes les URLs `https://patrimoine-expert.fr` par votre vrai domaine dans tous les fichiers HTML
- [ ] Ajouter des images réelles dans `/assets/images/` (articles, photo auteur)
- [ ] Mettre à jour les balises `og:image` avec des images réelles
- [ ] Tester les Core Web Vitals sur [PageSpeed Insights](https://pagespeed.web.dev/)
- [ ] Vérifier la conformité RGPD sur [CookieMetrix](https://www.cookiemetrix.com/)
- [ ] Créer un compte Google Analytics et intégrer le tag (soumis au consentement cookie)

---

## Personnalisation rapide

### Changer les couleurs
Dans `assets/css/style.css`, modifiez les variables CSS au début du fichier :
```css
:root {
  --primary:  #1B3A6B;   /* Bleu marine */
  --gold:     #C9A84C;   /* Or */
  --green:    #2D9B6F;   /* Vert */
}
```

### Changer l'auteur fictif
Remplacez "Thomas Mercier" dans tous les fichiers HTML par votre nom ou celui de votre auteur.

### Ajouter un article
1. Dupliquez un fichier existant dans `/articles/`
2. Modifiez le titre, la méta-description, le contenu et les données Schema.org
3. Ajoutez l'URL dans `sitemap.xml`
4. Ajoutez le lien dans `index.html` et `plan-du-site.html`

---

## Technologies utilisées

- HTML5 sémantique (W3C valide)
- CSS3 (variables, flexbox, grid, media queries)
- JavaScript vanilla ES6+ (pas de dépendances)
- Google Fonts (Merriweather + Open Sans)
- Schema.org (données structurées JSON-LD)
- Formspree (formulaire de contact)

---

## Licence

Ce projet est fourni à titre éducatif. Le contenu éditorial (articles) est la propriété de l'auteur.
Vous êtes libre d'adapter la structure technique pour votre propre blog.

---

*Créé en avril 2026 — Patrimoine Expert*
