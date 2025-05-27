import React from 'react';
import MainLayout from '@/components/MainLayout';

export default function TermsPage() {
  return (
    <MainLayout>
      <div className="w-full max-w-3xl space-y-8 py-12 mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Terms of Service
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-muted-foreground sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Welcome to Lifeaware! These terms and conditions outline the rules and regulations for the use of Lifeaware&apos;s Website.
          </p>
        </div>

        <div className="prose prose-lg dark:prose-invert mx-auto">
          <h2 className="text-2xl font-bold mt-8 mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing this website, we assume you accept these terms and conditions. Do not continue to use Lifeaware if you do not agree to take all of the terms and conditions stated on this page.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">2. License</h2>
          <p>
            Unless otherwise stated, Lifeaware and/or its licensors own the intellectual property rights for all material on Lifeaware. All intellectual property rights are reserved. You may access this from Lifeaware for your own personal use subjected to restrictions set in these terms and conditions.
          </p>
          <p>You must not:</p>
          <ul>
            <li>Republish material from Lifeaware</li>
            <li>Sell, rent or sub-license material from Lifeaware</li>
            <li>Reproduce, duplicate or copy material from Lifeaware</li>
            <li>Redistribute content from Lifeaware</li>
          </ul>

          <h2 className="text-2xl font-bold mt-8 mb-4">3. User Comments</h2>
          <p>
            This Agreement shall begin on the date hereof. Certain parts of this website offer an opportunity for users to post and exchange opinions and information. Lifeaware does not filter, edit, publish or review Comments prior to their presence on the website. Comments do not reflect the views and opinions of Lifeaware, its agents and/or affiliates. Comments reflect the views and opinions of the person who posts their views and opinions.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">4. Disclaimer - No Medical Advice</h2>
          <p>
            The information provided by Lifeaware is for general informational purposes only. All information on the Site is provided in good faith, however, we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information on the Site.
          </p>
          <p>
            <strong>Lifeaware does not provide medical advice.</strong> The content is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay in seeking it because of something you have read on this website.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">5. Limitation of Liability</h2>
          <p>
            In no event shall Lifeaware, nor any of its officers, directors and employees, be held liable for anything arising out of or in any way connected with your use of this Website whether such liability is under contract. Lifeaware, including its officers, directors and employees shall not be held liable for any indirect, consequential or special liability arising out of or in any way related to your use of this Website.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">6. Governing Law</h2>
          <p>
            These Terms will be governed by and interpreted in accordance with the laws of the jurisdiction in which Lifeaware operates, and you submit to the non-exclusive jurisdiction of the state and federal courts located in that jurisdiction for the resolution of any disputes.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">7. Changes to These Terms</h2>
          <p>
            We reserve the right to revise these terms and conditions at any time. By using this Website, you are expected to review these terms on a regular basis.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us.
          </p>
        </div>
      </div>
    </MainLayout>
  );
} 