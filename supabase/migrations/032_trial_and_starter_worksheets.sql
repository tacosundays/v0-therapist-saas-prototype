-- Preserve the advertised 14-day trial when a therapist's organization is provisioned,
-- and give every therapist a small, structured starter worksheet library.

ALTER TABLE public.organizations
  ALTER COLUMN subscription_status SET DEFAULT 'trialing',
  ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '14 days');

CREATE OR REPLACE FUNCTION public.provision_solo_organization()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE new_organization_id uuid; new_location_id uuid; effective_trial_end timestamptz;
BEGIN
  IF NEW.organization_id IS NULL THEN
    effective_trial_end := COALESCE(NEW.trial_ends_at, NEW.trial_end_date, now() + interval '14 days');
    INSERT INTO public.organizations(
      name, owner_therapist_id, billing_owner_therapist_id, plan, subscription_plan,
      subscription_status, trial_ends_at, max_seats
    )
    VALUES(
      COALESCE(NULLIF(NEW.practice_name,''),NULLIF(NEW.full_name,'')||' Practice','My Practice'),
      NEW.id, NEW.id,
      COALESCE(NULLIF(NEW.plan,''),NULLIF(NEW.subscription_plan,''),'free'),
      COALESCE(NULLIF(NEW.subscription_plan,''),NULLIF(NEW.plan,''),'free'),
      CASE
        WHEN NULLIF(NEW.subscription_status,'') IN ('active','trialing') THEN NEW.subscription_status
        WHEN effective_trial_end > now() THEN 'trialing'
        ELSE COALESCE(NULLIF(NEW.subscription_status,''),'inactive')
      END,
      effective_trial_end,
      1
    )
    RETURNING id INTO new_organization_id;
    UPDATE public.therapists
    SET organization_id=new_organization_id,
        auth_user_id=CASE WHEN NEW.auth_user_id IS NULL AND EXISTS(SELECT 1 FROM auth.users u WHERE u.id=NEW.id) THEN NEW.id ELSE NEW.auth_user_id END
    WHERE id=NEW.id;
    INSERT INTO public.organization_members(organization_id,therapist_id,role) VALUES(new_organization_id,NEW.id,'owner');
    INSERT INTO public.locations(organization_id,name,is_primary) VALUES(new_organization_id,'Primary Location',true) RETURNING id INTO new_location_id;
    INSERT INTO public.location_memberships(organization_id,location_id,therapist_id,is_primary) VALUES(new_organization_id,new_location_id,NEW.id,true);
  END IF;
  RETURN NULL;
END; $$;

UPDATE public.organizations o
SET subscription_status = 'trialing',
    trial_ends_at = COALESCE(t.trial_ends_at, t.trial_end_date)
FROM public.therapists t
WHERE t.id = o.billing_owner_therapist_id
  AND o.subscription_status = 'inactive'
  AND o.stripe_subscription_id IS NULL
  AND COALESCE(t.trial_ends_at, t.trial_end_date) > now();

CREATE OR REPLACE FUNCTION public.seed_starter_worksheet_templates(target_therapist_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE template_id uuid;
BEGIN
  INSERT INTO public.worksheet_templates(therapist_id,title,description,category,source_type)
  SELECT target_therapist_id,'Anxiety Thought Record','Identify an anxious thought, examine the evidence, and develop a more balanced response.','cbt','premade'
  WHERE NOT EXISTS (SELECT 1 FROM public.worksheet_templates WHERE therapist_id=target_therapist_id AND title='Anxiety Thought Record' AND source_type='premade')
  RETURNING id INTO template_id;
  SELECT COALESCE(template_id,(SELECT id FROM public.worksheet_templates WHERE therapist_id=target_therapist_id AND title='Anxiety Thought Record' AND source_type='premade' ORDER BY created_at LIMIT 1)) INTO template_id;
  IF NOT EXISTS (SELECT 1 FROM public.worksheet_questions WHERE worksheet_template_id=template_id) THEN
    INSERT INTO public.worksheet_questions(worksheet_template_id,question_text,question_type,options,required,order_index) VALUES
      (template_id,'What situation triggered the anxious thought?','long_text',NULL,true,0),
      (template_id,'What automatic thought went through your mind?','long_text',NULL,true,1),
      (template_id,'How intense was the emotion?','scale','{"min":1,"max":10,"labels":{"1":"Mild","10":"Very intense"}}',true,2),
      (template_id,'What evidence supports the thought?','long_text',NULL,false,3),
      (template_id,'What evidence does not support the thought?','long_text',NULL,false,4),
      (template_id,'What is a more balanced thought?','long_text',NULL,true,5),
      (template_id,'What helpful next step can you take?','short_text',NULL,false,6);
  END IF;

  template_id := NULL;
  INSERT INTO public.worksheet_templates(therapist_id,title,description,category,source_type)
  SELECT target_therapist_id,'Communication Repair Exercise','Slow down a difficult interaction and plan a clear, accountable repair.','journaling','premade'
  WHERE NOT EXISTS (SELECT 1 FROM public.worksheet_templates WHERE therapist_id=target_therapist_id AND title='Communication Repair Exercise' AND source_type='premade')
  RETURNING id INTO template_id;
  SELECT COALESCE(template_id,(SELECT id FROM public.worksheet_templates WHERE therapist_id=target_therapist_id AND title='Communication Repair Exercise' AND source_type='premade' ORDER BY created_at LIMIT 1)) INTO template_id;
  IF NOT EXISTS (SELECT 1 FROM public.worksheet_questions WHERE worksheet_template_id=template_id) THEN
    INSERT INTO public.worksheet_questions(worksheet_template_id,question_text,question_type,required,order_index) VALUES
      (template_id,'Briefly describe what happened.','long_text',true,0),
      (template_id,'What did you feel and need in that moment?','long_text',true,1),
      (template_id,'What might the other person have experienced?','long_text',false,2),
      (template_id,'What part can you take responsibility for?','long_text',true,3),
      (template_id,'What would a meaningful repair sound or look like?','long_text',true,4),
      (template_id,'What is one next step you are willing to take?','short_text',true,5);
  END IF;

  template_id := NULL;
  INSERT INTO public.worksheet_templates(therapist_id,title,description,category,source_type)
  SELECT target_therapist_id,'Values Clarification Worksheet','Clarify what matters and identify a small values-aligned action.','act','premade'
  WHERE NOT EXISTS (SELECT 1 FROM public.worksheet_templates WHERE therapist_id=target_therapist_id AND title='Values Clarification Worksheet' AND source_type='premade')
  RETURNING id INTO template_id;
  SELECT COALESCE(template_id,(SELECT id FROM public.worksheet_templates WHERE therapist_id=target_therapist_id AND title='Values Clarification Worksheet' AND source_type='premade' ORDER BY created_at LIMIT 1)) INTO template_id;
  IF NOT EXISTS (SELECT 1 FROM public.worksheet_questions WHERE worksheet_template_id=template_id) THEN
    INSERT INTO public.worksheet_questions(worksheet_template_id,question_text,question_type,options,required,order_index) VALUES
      (template_id,'Which area of life would you like to focus on?','multiple_choice','["Relationships","Work or education","Health","Community","Personal growth","Rest and recreation"]',true,0),
      (template_id,'What qualities do you want to bring to this area of your life?','long_text',NULL,true,1),
      (template_id,'How closely are your current actions aligned with those values?','scale','{"min":1,"max":10,"labels":{"1":"Not aligned","10":"Very aligned"}}',true,2),
      (template_id,'What is one small values-aligned action you can take this week?','long_text',NULL,true,3),
      (template_id,'What could get in the way, and how might you respond?','long_text',NULL,false,4);
  END IF;

  template_id := NULL;
  INSERT INTO public.worksheet_templates(therapist_id,title,description,category,source_type)
  SELECT target_therapist_id,'Attachment Trigger Reflection','Notice attachment triggers and choose a more regulated response.','journaling','premade'
  WHERE NOT EXISTS (SELECT 1 FROM public.worksheet_templates WHERE therapist_id=target_therapist_id AND title='Attachment Trigger Reflection' AND source_type='premade')
  RETURNING id INTO template_id;
  SELECT COALESCE(template_id,(SELECT id FROM public.worksheet_templates WHERE therapist_id=target_therapist_id AND title='Attachment Trigger Reflection' AND source_type='premade' ORDER BY created_at LIMIT 1)) INTO template_id;
  IF NOT EXISTS (SELECT 1 FROM public.worksheet_questions WHERE worksheet_template_id=template_id) THEN
    INSERT INTO public.worksheet_questions(worksheet_template_id,question_text,question_type,required,order_index) VALUES
      (template_id,'What happened just before you felt triggered?','long_text',true,0),
      (template_id,'What emotions and body sensations did you notice?','long_text',true,1),
      (template_id,'What story or meaning did your mind attach to the situation?','long_text',true,2),
      (template_id,'What need was underneath your reaction?','long_text',false,3),
      (template_id,'What would a more regulated response look like?','long_text',true,4);
  END IF;

  template_id := NULL;
  INSERT INTO public.worksheet_templates(therapist_id,title,description,category,source_type)
  SELECT target_therapist_id,'Mindfulness Grounding Exercise','Use the five senses to reconnect with the present moment.','mindfulness','premade'
  WHERE NOT EXISTS (SELECT 1 FROM public.worksheet_templates WHERE therapist_id=target_therapist_id AND title='Mindfulness Grounding Exercise' AND source_type='premade')
  RETURNING id INTO template_id;
  SELECT COALESCE(template_id,(SELECT id FROM public.worksheet_templates WHERE therapist_id=target_therapist_id AND title='Mindfulness Grounding Exercise' AND source_type='premade' ORDER BY created_at LIMIT 1)) INTO template_id;
  IF NOT EXISTS (SELECT 1 FROM public.worksheet_questions WHERE worksheet_template_id=template_id) THEN
    INSERT INTO public.worksheet_questions(worksheet_template_id,question_text,question_type,options,required,order_index) VALUES
      (template_id,'How activated or distressed do you feel before grounding?','scale','{"min":1,"max":10,"labels":{"1":"Calm","10":"Highly activated"}}',true,0),
      (template_id,'Name five things you can see, four you can feel, three you can hear, two you can smell, and one you can taste.','long_text',NULL,true,1),
      (template_id,'How activated or distressed do you feel after grounding?','scale','{"min":1,"max":10,"labels":{"1":"Calm","10":"Highly activated"}}',true,2),
      (template_id,'What did you notice during the exercise?','long_text',NULL,false,3);
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.seed_starter_worksheets_after_therapist_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.seed_starter_worksheet_templates(NEW.id);
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS seed_starter_worksheets_after_therapist_insert ON public.therapists;
CREATE TRIGGER seed_starter_worksheets_after_therapist_insert
AFTER INSERT ON public.therapists
FOR EACH ROW EXECUTE FUNCTION public.seed_starter_worksheets_after_therapist_insert();

SELECT public.seed_starter_worksheet_templates(id) FROM public.therapists;

REVOKE ALL ON FUNCTION public.seed_starter_worksheet_templates(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.seed_starter_worksheets_after_therapist_insert() FROM PUBLIC,anon,authenticated;
