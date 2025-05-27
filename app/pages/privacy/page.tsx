import React from 'react';
import MainLayout from '@/components/MainLayout';

export default function PrivacyPage() {
  return (
    <MainLayout>
      <div className="w-full max-w-3xl space-y-8 py-12 mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Privacy Policy
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-muted-foreground sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Your privacy is important to us. It is Lifeaware&apos;s policy to respect your privacy regarding any information we may collect from you across our website.
          </p>
        </div>

        <div className="prose prose-lg dark:prose-invert mx-auto">
          <h2 className="text-2xl font-bold mt-8 mb-4">Information We Collect</h2>
          <p>
            We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we&apos;re collecting it and how it will be used.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">How We Use Your Information</h2>
          <p>
            We only retain collected information for as long as necessary to provide you with your requested service. What data we store, we&apos;ll protect within commercially acceptable means to prevent loss and theft, as well as unauthorized access, disclosure, copying, use or modification.
          </p>
          <p>
            We don&apos;t share any personally identifying information publicly or with third-parties, except when required to by law.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">Cookies</h2>
          <p>
            We use cookies to make your experience on Lifeaware better. You can set your browser to refuse cookies, but some parts of our site might not work as expected.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">Links to Other Sites</h2>
          <p>
            Our website may link to external sites that are not operated by us. Please be aware that we have no control over the content and practices of these sites, and cannot accept responsibility or liability for their respective privacy policies.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">Your Consent</h2>
          <p>
            By using our website, you hereby consent to our Privacy Policy and agree to its terms.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">Changes to Our Privacy Policy</h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us.
          </p>
        </div>
      </div>
    </MainLayout>
  );
} 