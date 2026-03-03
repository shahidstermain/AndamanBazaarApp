-- Fix RLS initplan warnings by wrapping auth.* calls with SELECT
-- and consolidate duplicate permissive policies.

-- Audit logs
ALTER POLICY "Users can view own audit logs" ON public.audit_logs
  USING ((select auth.uid()) = user_id);

-- Chat typing events
ALTER POLICY "Users can insert own typing events" ON public.chat_typing_events
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users can view typing in their chats" ON public.chat_typing_events
  USING (
    EXISTS (
      SELECT 1
      FROM chats
      WHERE chats.id = chat_typing_events.chat_id
        AND (
          chats.buyer_id = (select auth.uid())
          OR chats.seller_id = (select auth.uid())
        )
    )
  );

-- Chats
DROP POLICY IF EXISTS "Users can insert chats" ON public.chats;

ALTER POLICY "Users can create chats" ON public.chats
  WITH CHECK ((select auth.uid()) = buyer_id);

ALTER POLICY "Users can update their own chats" ON public.chats
  USING (
    (select auth.uid()) = buyer_id
    OR (select auth.uid()) = seller_id
  );

ALTER POLICY "Users can view their own chats" ON public.chats
  USING (
    (select auth.uid()) = buyer_id
    OR (select auth.uid()) = seller_id
  );

-- Favorites
DROP POLICY IF EXISTS "Users can manage their favorites" ON public.favorites;

ALTER POLICY "Users can delete own favorites" ON public.favorites
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can insert own favorites" ON public.favorites
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users can view own favorites" ON public.favorites
  USING ((select auth.uid()) = user_id);

-- Invoices
ALTER POLICY "Service role full access invoices" ON public.invoices
  TO service_role
  USING ((select auth.role()) = 'service_role'::text)
  WITH CHECK ((select auth.role()) = 'service_role'::text);

ALTER POLICY "Users can view own invoices" ON public.invoices
  USING ((select auth.uid()) = user_id);

-- Listing boosts
ALTER POLICY "Service role full access boosts" ON public.listing_boosts
  TO service_role
  USING ((select auth.role()) = 'service_role'::text)
  WITH CHECK ((select auth.role()) = 'service_role'::text);

ALTER POLICY "Users can view own boosts" ON public.listing_boosts
  USING ((select auth.uid()) = user_id);

-- Listing images
ALTER POLICY "Users can insert images for own listings" ON public.listing_images
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM listings
      WHERE listings.id = listing_images.listing_id
        AND listings.user_id = (select auth.uid())
    )
  );

-- Listings
ALTER POLICY "Listings are viewable by everyone" ON public.listings
  USING (
    (status <> 'deleted'::text)
    OR (user_id = (select auth.uid()))
  );

ALTER POLICY "Users can delete own listings" ON public.listings
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can insert own listings" ON public.listings
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users can update own listings" ON public.listings
  USING ((select auth.uid()) = user_id);

-- Messages
DROP POLICY IF EXISTS "Users can send messages in their chats" ON public.messages;

ALTER POLICY "Users can insert messages in their chats" ON public.messages
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM chats
      WHERE chats.id = messages.chat_id
        AND (
          chats.buyer_id = (select auth.uid())
          OR chats.seller_id = (select auth.uid())
        )
    )
  );

ALTER POLICY "Users can view messages in their chats" ON public.messages
  USING (
    EXISTS (
      SELECT 1
      FROM chats
      WHERE chats.id = messages.chat_id
        AND (
          chats.buyer_id = (select auth.uid())
          OR chats.seller_id = (select auth.uid())
        )
    )
  );

-- Payment audit log
ALTER POLICY "Service role full access audit" ON public.payment_audit_log
  TO service_role
  USING ((select auth.role()) = 'service_role'::text)
  WITH CHECK ((select auth.role()) = 'service_role'::text);

-- Rate limits
ALTER POLICY "Users can view own rate limits" ON public.rate_limits
  USING (key ~~ ((select auth.uid())::text || '%'::text));

-- Recommendations cache
ALTER POLICY "Users can view own recommendations" ON public.recommendations_cache
  USING ((select auth.uid()) = user_id);

-- Reports
ALTER POLICY "Admins can update reports" ON public.reports
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['admin'::app_role, 'moderator'::app_role])
    )
  );

ALTER POLICY "Admins can view reports" ON public.reports
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['admin'::app_role, 'moderator'::app_role])
    )
  );

ALTER POLICY "Users can create reports" ON public.reports
  WITH CHECK ((select auth.uid()) = reporter_id);

-- User interactions
ALTER POLICY "Users can insert own interactions" ON public.user_interactions
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users can view own interactions" ON public.user_interactions
  USING ((select auth.uid()) = user_id);

-- User roles
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;

ALTER POLICY "Users can read own role" ON public.user_roles
  USING (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1
      FROM user_roles user_roles_1
      WHERE user_roles_1.user_id = (select auth.uid())
        AND user_roles_1.role = 'admin'::app_role
    )
  );
