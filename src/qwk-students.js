const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function postAndUpdateMap(user_id, form, userMap, userLastWeekScore) {
  const res = await axios.post('https://rt.qingwk.com/coach/user/questions',
    form.getBuffer(),
    { headers: form.getHeaders() }
  );
  const assignments = res.data.data.datas;
  for (const a of assignments) {
    if (a.sumTotalScore && (!userMap[user_id][a.subjectId] || userMap[user_id][a.subjectId] < a.sumTotalScore)) {
      userMap[user_id][a.subjectId] = a.sumTotalScore;
    }
    if (a.sumTotalScore && (!userLastWeekScore[user_id][a.subjectId] || userLastWeekScore[user_id][a.subjectId] < a.sumTotalScore)) {
      const date = new Date(a.createAt);
      if (date.getTime() <= 1595714400000+1000*60*60*24*7*8) {
        userLastWeekScore[user_id][a.subjectId] = a.sumTotalScore;
      }
    }
  }
  return res;
}

async function update() {
  const users = fs.readFileSync(path.join(__dirname + '/../data/qwk/users.txt'))
    .toString()
    .split('\n')
    .filter(a => a !== '')
    .map(u => u.split('\t'));

  const courses = fs.readFileSync(path.join(__dirname + '/../data/qwk/courses.txt'))
    .toString()
    .split('\n')
    .filter(a => a !== '')
    .map(u => u.split('\t'));

  const userMap = {};
  const userLastWeekScore = {};

  let index = 0;
  for (const user of users) {
    const user_id = user[1];
    userMap[user_id] = {};
    userLastWeekScore[user_id] = {};
    const form = new FormData();
    form.append('userId', user_id);
    form.append('sort', 'n2o');
    form.append('score', 'all');
    const res = await postAndUpdateMap(user_id, form, userMap, userLastWeekScore);
    if (res.data.data.pageCount > 1) {
      for (let i = 1; i <= res.data.data.pageCount; i++) {
        const form = new FormData();
        form.append('userId', user_id);
        form.append('sort', 'n2o');
        form.append('score', 'all');
        form.append('index', i);
        await postAndUpdateMap(user_id, form, userMap, userLastWeekScore);
      }
    }
    index++;
    console.log(`${index} of ${users.length} completed.`)
  }
  fs.writeFileSync(path.join(__dirname + '/../data/qwk/results.js'),
    `const data = ${JSON.stringify(userMap)};const lastWeek = ${JSON.stringify(userLastWeekScore)};`);
  console.log('Done.');
}

async function allCourse() {
  const form = new FormData();
  form.append('courseId', 10075);
  const res = await axios.post('https://rt.qingwk.com/coach/subject/list',
    form.getBuffer(),
    { headers: form.getHeaders() }
  );
  const courses = res.data.data;
  for (const c of courses) {
    const id = c.id;
    const name = c.name;
    console.log(id, name);
  }
}

update();
