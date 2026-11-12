import { useEffect, useState } from 'react';

const API = 'http://localhost:8000';

interface Section { title: string; body: string[] }

// Standard AdSense-ready privacy policy. The advertising/cookies section is
// required by Google's programme policies once ads are live.
const SECTIONS: Section[] = [
  {
    title: 'Information we collect',
    body: [
      'When you browse this site we collect basic, automatically-sent technical information such as your browser type, device type, approximate region, referring page and the pages you view. This is standard web-server information and is used to keep the site working and to understand which stories people read.',
      'If you contact us by email, we receive the information you choose to send us (such as your name, email address and the content of your message). We use it only to respond to you and, where relevant, to follow up on a story submission.',
      'We do not ask visitors to create accounts, and we do not knowingly collect sensitive personal information.',
    ],
  },
  {
    title: 'How we use information',
    body: [
      'We use the information described above to operate and improve the site, to measure how stories and sections perform, and to respond to messages. We do not sell your personal information.',
    ],
  },
  {
    title: 'Cookies and advertising',
    body: [
      'This site may display advertising served by Google, including through Google AdSense. Third-party vendors, including Google, use cookies to serve ads based on a user\'s prior visits to this and other websites.',
      'Google\'s use of advertising cookies enables it and its partners to serve ads to you based on your visit to this site and/or other sites on the internet.',
      'You may opt out of personalised advertising by visiting Google Ads Settings (https://adssettings.google.com), or opt out of third-party vendor cookies for personalised advertising at https://www.aboutads.info. You can also control or delete cookies through your browser settings; blocking cookies may affect how some parts of the site work.',
      'The site may also use essential cookies or local storage for basic functionality. These do not contain personal information.',
    ],
  },
  {
    title: 'Analytics',
    body: [
      'We may use privacy-respecting analytics to count page views and understand general readership patterns. Where third-party analytics are used, their own privacy policies apply to the data they collect.',
    ],
  },
  {
    title: 'Data sharing',
    body: [
      'We share information only with the service providers that operate this site (such as our hosting and advertising partners), where required by law, or to protect the rights and safety of the site and its users.',
    ],
  },
  {
    title: 'Children\'s privacy',
    body: [
      'This site is a general-audience news publication and is not directed at children under 13. We do not knowingly collect personal information from children.',
    ],
  },
  {
    title: 'Changes to this policy',
    body: [
      'We may update this policy from time to time as the site evolves. Changes are published on this page, and the date below shows the latest revision.',
    ],
  },
];

export default function PrivacyPage() {
  const [siteName, setSiteName] = useState('EBONYI NEWS FORUM');
  const [email, setEmail] = useState('editor@ebonyinewsforum.ng');

  useEffect(() => {
    fetch(`${API}/api/branding`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        if (d.site_name) setSiteName(String(d.site_name).toUpperCase());
        if (d.contribute_email) setEmail(String(d.contribute_email));
      })
      .catch(() => { /* offline backend: defaults stay */ });
  }, []);

  return <div className="min-h-screen bg-paper">
    <div className="bg-ink text-white text-xs"><div className="mx-auto flex max-w-3xl justify-between px-5 py-2.5"><span className="tracking-[.18em] uppercase text-white/70">{siteName}</span><a href="#/" className="text-white/70 hover:text-white">← Back to the site</a></div></div>
    <main className="mx-auto max-w-3xl px-5 py-14">
      <div className="mb-3 text-[10px] font-bold uppercase tracking-[.25em] text-forest">Legal</div>
      <h1 className="serif text-4xl leading-tight md:text-5xl">Privacy <i className="text-gold">policy.</i></h1>
      <p className="mt-4 text-xs font-bold uppercase tracking-widest text-stone-400">Last updated · 12 November 2026</p>
      <p className="mt-6 text-sm leading-7 text-stone-600">This policy explains what information {siteName} collects when you visit, how it is used, and the choices you have — including how advertising cookies work once ads are enabled on the site.</p>
      {SECTIONS.map(s => <section key={s.title} className="mt-10 border-t border-stone-200 pt-8">
        <h2 className="serif text-2xl">{s.title}</h2>
        <div className="mt-3 space-y-4 text-sm leading-7 text-stone-600">{s.body.map((p, i) => <p key={i}>{p}</p>)}</div>
      </section>)}
      <section className="mt-10 border-t border-stone-200 pt-8">
        <h2 className="serif text-2xl">Contact us</h2>
        <p className="mt-3 text-sm leading-7 text-stone-600">Questions about this policy, or about your information? Write to us at <a href={`mailto:${email}`} className="font-bold text-forest hover:underline">{email}</a>.</p>
      </section>
    </main>
    <footer className="border-t border-stone-200 py-6 text-center text-[10px] tracking-wider text-stone-400">© {new Date().getFullYear()} {siteName}</footer>
  </div>;
}
