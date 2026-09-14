/* EmailJS configuration (client-safe values only).
   EmailJS public keys are DESIGNED to be used in frontend code. The private
   "secret key" in your EmailJS dashboard must NEVER be placed in the browser.
   Restrict abuse from the EmailJS dashboard: General > Security > Allowed
   Domains (add yours), and enable rate limiting where available. */
window.PORTFOLIO_CONFIG = {
  /* EmailJS service ID */
  serviceId: "service_s38qofp",

  /* Template: Portfolio Visitor Alert */
  visitorTemplateId: "template_53e4wyp",

  /* Template: Portfolio Contact Message */
  contactTemplateId: "template_p89ip36",

  /* EmailJS public key (client-safe) */
  publicKey: "zOPjbmG1QpSU5ZNoy",

  /* DEV MODE: set to false to STOP sending visitor-notification emails
     (tracking still runs and logs to the console instead).
     Set to true only for production. */
  enableVisitorEmail: true
};