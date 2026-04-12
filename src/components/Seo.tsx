import { Helmet } from "react-helmet-async";

interface SeoProps {
  title: string;
  description: string;
  imageUrl?: string;
}

export const Seo: React.FC<SeoProps> = ({ title, description, imageUrl }) => {
  const siteTitle = `${title} | AndamanBazaar`;
  return (
    <Helmet>
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      {imageUrl && <meta property="og:image" content={imageUrl} />}
    </Helmet>
  );
};
