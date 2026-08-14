/* Whether the landing's loader intro has already played. Module scope persists across
   SPA route changes (the module stays loaded) and resets on a full reload. Lives in its
   own module because two consumers need it: Landing (to skip the intro on re-mounts)
   and the route-transition layer (PageTransition / HomeCurtains pick the return-to-home
   curtain only once the landing has actually revealed — before that, the Loader is the
   transition). */
let revealed = false;

export const markLandingRevealed = () => {
  revealed = true;
};

export const landingHasRevealed = () => revealed;
