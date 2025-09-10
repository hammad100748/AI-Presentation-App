import {Platform} from 'react-native';

export const PRE_LOADED_BANNERS = [
  {
    imagePath: Platform.select({
      ios: require('./ios/AI_STORY.webp'),
      android: require('./android/NOVEL_HUB.webp'),
    }),
    appLink: Platform.select({
      ios: 'https://apps.apple.com/app/ai-story-generator-novel-maker/id6538725679',
      android:
        'https://play.google.com/store/apps/details?id=com.ford9.AI.Story.Maker.Novel.Generator.Creator.Writer.Builder',
    }),
    title: 'ai_story_generator',
  },
  {
    imagePath: Platform.select({
      ios: null,
      android: require('./android/AI_COURSE_GEN.webp'),
    }),
    appLink: Platform.select({
      ios: null,
      android:
        'https://play.google.com/store/apps/details?id=com.ford9.courseai.generator.creator.maker.online.syllabus',
    }),
    title: 'ai_course_generator',
  },
  {
    imagePath: Platform.select({
      ios: require('./ios/AI_COVER_LETTER.webp'),
      android: require('./android/AI_COVER_LETTER.webp'),
    }),
    appLink: Platform.select({
      ios: null,
      android:
        'https://play.google.com/store/apps/details?id=com.ford9.AI.CoverLetter.Generator.Creator.Builder.Maker.Writer',
    }),
    title: 'ai_cover_letter',
  },  
  {
    imagePath: Platform.select({
      ios: null,
      android: require('./android/AI_Quiz.webp'),
    }),
    appLink: Platform.select({
      ios: null,
      android:
        'https://play.google.com/store/apps/details?id=com.ford9.ai.quiz.questions.generator.creator.maker.builder.writer',
    }),
    title: 'ai_quiz_generator',
  },
  {
    imagePath: Platform.select({
      // ios: require('./ios/AI_POEM.webp'),
      ios: null,
      android: require('./android/AI_POEM.webp'),
    }),
    appLink: Platform.select({
      // ios: 'https://apps.apple.com/us/app/ai-poems-poetries-app/id6742147410',
      ios: null,
      android:
        'https://play.google.com/store/apps/details?id=com.ford9.ai.poem.generator.poetry.maker.builder.writer.creator',
    }),
    title: 'ai_poem_generator',
  },  
  {
    imagePath: Platform.select({
      ios: null,
      android: require('./android/AI_CODING.webp'),
    }),
    appLink: Platform.select({
      ios: null,
      android:
        'https://play.google.com/store/apps/details?id=com.ford9.ai.coding.generator.code.creator.maker.writer.builder.assistant',
    }),
    title: 'ai_coding_generator',
  },
  {
    imagePath: Platform.select({
      ios: null,
      android: require('./android/AI_INTERVIEW.webp'),
    }),
    appLink: Platform.select({
      ios: null,
      android:
        'https://play.google.com/store/apps/details?id=com.ford9.ai.job.mock.interview.preparation.generator.maker.builder.creator',
    }),
    title: 'ai_interview_preparation',
  },
  {
    imagePath: Platform.select({
      ios: null,
      android: require('./android/AI_APPLICATION.webp'),
    }),
    appLink: Platform.select({
      ios: null,
      android:
        'https://play.google.com/store/apps/details?id=com.ford9.ai.application.letter.creator.maker.writer.generator.builder',
    }),
    title: 'ai_application_builder',
  },
  {
    imagePath: Platform.select({
      ios: null,
      android: require('./android/DIGITAL_COUNTER.webp'),
    }),
    appLink: Platform.select({
      ios: null,
      android:
        'https://play.google.com/store/apps/details?id=com.ford9.digital.tally.counter.dhikr.tasbeeh',
    }),
    title: 'digital_counter',
  }  
];
