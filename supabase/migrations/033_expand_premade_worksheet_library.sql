-- Expand every therapist's premade library from five starter worksheets to 215
-- structured, fillable worksheets. The generated material is original and
-- evidence-informed; it does not reproduce proprietary clinical instruments.

CREATE OR REPLACE FUNCTION public.seed_expanded_worksheet_library(target_therapist_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  topic_record record;
  format_record record;
  template_id uuid;
  worksheet_title text;
BEGIN
  FOR topic_record IN
    SELECT * FROM (VALUES
      ('cbt','Anxiety Triggers','noticing anxiety triggers and choosing a balanced response'),
      ('cbt','Automatic Thoughts','identifying automatic thoughts and testing their accuracy'),
      ('cbt','Cognitive Distortions','recognizing unhelpful thinking patterns'),
      ('cbt','Behavioral Activation','building momentum through meaningful activity'),
      ('cbt','Worry Management','responding to worry with structure and perspective'),
      ('cbt','Social Anxiety','approaching social situations with flexible thinking'),
      ('cbt','Perfectionism','practicing realistic standards and self-acceptance'),
      ('cbt','Procrastination','understanding avoidance and beginning manageable tasks'),
      ('cbt','Sleep Habits','strengthening thoughts and routines that support rest'),
      ('cbt','Self-Criticism','developing a fairer and more constructive inner voice'),
      ('dbt','Emotion Regulation','understanding emotions and selecting effective responses'),
      ('dbt','Distress Tolerance','getting through difficult moments without making them worse'),
      ('dbt','Interpersonal Effectiveness','asking for needs while respecting self and others'),
      ('dbt','Opposite Action','changing emotion-driven behavior when the facts support it'),
      ('dbt','Checking the Facts','separating observable facts from assumptions'),
      ('dbt','Wise Mind','integrating emotion and reason in decision-making'),
      ('dbt','PLEASE Self-Care','reducing emotional vulnerability through basic self-care'),
      ('dbt','Radical Acceptance','acknowledging reality while choosing the next effective step'),
      ('act','Values and Meaning','clarifying personal values and meaningful direction'),
      ('act','Cognitive Defusion','creating space from difficult thoughts'),
      ('act','Acceptance and Willingness','making room for internal experiences with compassion'),
      ('act','Committed Action','taking small actions guided by values'),
      ('act','Present-Moment Awareness','returning attention to what is happening now'),
      ('act','Self as Context','observing experiences without being defined by them'),
      ('act','Choice Point','noticing toward moves and away moves'),
      ('act','Values-Based Relationships','bringing chosen qualities into relationships'),
      ('mindfulness','Breath Awareness','using the breath as an anchor for attention'),
      ('mindfulness','Body Scan','noticing body sensations with curiosity'),
      ('mindfulness','Five Senses Grounding','reconnecting with the present through the senses'),
      ('mindfulness','Mindful Eating','bringing awareness and choice to eating'),
      ('mindfulness','Mindful Walking','practicing present-moment attention while moving'),
      ('mindfulness','Urge Surfing','observing urges as temporary waves'),
      ('mindfulness','Self-Compassion','responding to difficulty with warmth and perspective'),
      ('mindfulness','Loving-Kindness','cultivating goodwill toward self and others'),
      ('journaling','Gratitude and Positive Moments','noticing meaningful and supportive moments'),
      ('journaling','Relationship Boundaries','clarifying limits, needs, and respectful communication'),
      ('journaling','Conflict Reflection','learning from conflict and planning repair'),
      ('journaling','Grief and Loss','making space for grief, memory, and support'),
      ('journaling','Identity and Strengths','exploring identity, resilience, and personal strengths'),
      ('journaling','Life Transitions','navigating change with intention and support'),
      ('journaling','Recovery and Relapse Prevention','recognizing risks and strengthening recovery supports'),
      ('journaling','Parenting Stress','reflecting on parenting stress and intentional responses')
    ) AS topics(category,title,focus)
  LOOP
    FOR format_record IN
      SELECT * FROM (VALUES
        ('Awareness Check-In','Pause and notice what is happening right now.',0),
        ('Pattern Map','Map the sequence from trigger to response and consequence.',1),
        ('Skills Practice','Practice a specific skill and reflect on what changed.',2),
        ('Action Plan','Turn insight into one realistic, supported next step.',3),
        ('Weekly Review','Review the week, recognize progress, and choose a focus.',4)
      ) AS formats(label,description,format_index)
    LOOP
      worksheet_title := topic_record.title || ': ' || format_record.label;
      template_id := NULL;

      INSERT INTO public.worksheet_templates(therapist_id,title,description,category,source_type)
      SELECT target_therapist_id,
             worksheet_title,
             format_record.description || ' Focus: ' || topic_record.focus || '.',
             topic_record.category,
             'premade'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.worksheet_templates
        WHERE therapist_id=target_therapist_id
          AND title=worksheet_title
          AND source_type='premade'
      )
      RETURNING id INTO template_id;

      SELECT COALESCE(template_id,(
        SELECT id FROM public.worksheet_templates
        WHERE therapist_id=target_therapist_id
          AND title=worksheet_title
          AND source_type='premade'
        ORDER BY created_at LIMIT 1
      )) INTO template_id;

      IF NOT EXISTS (
        SELECT 1 FROM public.worksheet_questions
        WHERE worksheet_template_id=template_id
      ) THEN
        IF format_record.format_index = 0 THEN
          INSERT INTO public.worksheet_questions(worksheet_template_id,question_text,question_type,options,required,order_index) VALUES
            (template_id,'What is happening right now or what happened most recently?','long_text',NULL,true,0),
            (template_id,'What thoughts, emotions, urges, and body sensations do you notice?','long_text',NULL,true,1),
            (template_id,'How intense is this experience right now?','scale','{"min":1,"max":10,"labels":{"1":"Low","10":"Very high"}}',true,2),
            (template_id,'How does this connect with ' || topic_record.focus || '?','long_text',NULL,true,3),
            (template_id,'What would be a kind and effective response in this moment?','long_text',NULL,false,4);
        ELSIF format_record.format_index = 1 THEN
          INSERT INTO public.worksheet_questions(worksheet_template_id,question_text,question_type,options,required,order_index) VALUES
            (template_id,'Describe one specific recent example.','long_text',NULL,true,0),
            (template_id,'What triggered or set the situation in motion?','long_text',NULL,true,1),
            (template_id,'What did you think, feel, notice in your body, and feel urged to do?','long_text',NULL,true,2),
            (template_id,'What did you do, and what happened immediately afterward?','long_text',NULL,true,3),
            (template_id,'What were the longer-term effects?','long_text',NULL,false,4),
            (template_id,'Where could you try a different response next time?','long_text',NULL,true,5);
        ELSIF format_record.format_index = 2 THEN
          INSERT INTO public.worksheet_questions(worksheet_template_id,question_text,question_type,options,required,order_index) VALUES
            (template_id,'Which skill or strategy will you practice?','short_text',NULL,true,0),
            (template_id,'When and where will you practice it?','long_text',NULL,true,1),
            (template_id,'What are the steps in your own words?','long_text',NULL,true,2),
            (template_id,'Rate the intensity before practicing.','scale','{"min":1,"max":10,"labels":{"1":"Low","10":"Very high"}}',true,3),
            (template_id,'Rate the intensity after practicing.','scale','{"min":1,"max":10,"labels":{"1":"Low","10":"Very high"}}',true,4),
            (template_id,'What worked, what was difficult, and what will you adjust?','long_text',NULL,false,5);
        ELSIF format_record.format_index = 3 THEN
          INSERT INTO public.worksheet_questions(worksheet_template_id,question_text,question_type,options,required,order_index) VALUES
            (template_id,'What change would matter most in this area?','long_text',NULL,true,0),
            (template_id,'What is the smallest realistic next action?','long_text',NULL,true,1),
            (template_id,'When will you take this action?','date',NULL,true,2),
            (template_id,'What obstacle is most likely, and how will you respond?','long_text',NULL,true,3),
            (template_id,'Who or what can support you?','long_text',NULL,false,4),
            (template_id,'How confident are you that you can complete this step?','scale','{"min":1,"max":10,"labels":{"1":"Not confident","10":"Very confident"}}',true,5);
        ELSE
          INSERT INTO public.worksheet_questions(worksheet_template_id,question_text,question_type,options,required,order_index) VALUES
            (template_id,'What went better than expected this week?','long_text',NULL,true,0),
            (template_id,'What was most difficult?','long_text',NULL,true,1),
            (template_id,'What pattern did you notice related to ' || topic_record.focus || '?','long_text',NULL,true,2),
            (template_id,'How would you rate your progress this week?','scale','{"min":1,"max":10,"labels":{"1":"Little progress","10":"Strong progress"}}',true,3),
            (template_id,'What helped or supported your progress?','long_text',NULL,false,4),
            (template_id,'What is your focus for the coming week?','long_text',NULL,true,5);
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.seed_starter_worksheets_after_therapist_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.seed_starter_worksheet_templates(NEW.id);
  PERFORM public.seed_expanded_worksheet_library(NEW.id);
  RETURN NULL;
END; $$;

SELECT public.seed_expanded_worksheet_library(id) FROM public.therapists;

REVOKE ALL ON FUNCTION public.seed_expanded_worksheet_library(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.seed_starter_worksheets_after_therapist_insert() FROM PUBLIC,anon,authenticated;
