/*
  문제가 맞았다면 문제 관련 데이터를 파싱하는 함수의 모음입니다.
  모든 해당 파일의 모든 함수는 parseData()를 통해 호출됩니다.
*/

/*
  bojData를 초기화하는 함수로 문제 요약과 코드를 파싱합니다.
  - directory : 레포에 기록될 폴더명
  - message : 커밋 메시지
  - fileName : 파일명
  - readme : README.md에 작성할 내용
  - code : 소스코드 내용
*/
async function parseData() {
  const link = document.querySelector('head > meta[name$=url]').content.replace(/\?.*/g, '').trim();
  const problemId = document.querySelector('div.main > div.lesson-content').getAttribute('data-lesson-id');
  const level = document.querySelector('body > div.main > div.lesson-content').getAttribute("data-challenge-level")
  const division = [...document.querySelector('ol.breadcrumb').childNodes]
    .filter((x) => x.className !== 'active')
    .map((x) => x.innerText)
    // .filter((x) => !x.includes('코딩테스트'))
    .map((x) => convertSingleCharToDoubleChar(x))
    .reduce((a, b) => `${a}/${b}`);
  const title = document.querySelector('.algorithm-title .challenge-title').textContent.replace(/\\n/g, '').trim();
  const problem_description = document.querySelector('div.guide-section-description > div.markdown').innerHTML;
  const language_extension = document.querySelector('div.editor > ul > li.nav-item > a').innerText.split('.')[1];
  const code = document.querySelector('textarea#code').value;
  const result_message =
    [...document.querySelectorAll('#output .console-message')]
      .map((node) => node.textContent)
      .filter((text) => text.includes(':'))
      .reduce((cur, next) => (cur ? `${cur}<br/>${next}` : next), '') || 'Empty';
  const [runtime, memory] = [...document.querySelectorAll('td.result.passed')]
    .map((x) => x.innerText)
    .map((x) => x.replace(/[^., 0-9a-zA-Z]/g, '').trim())
    .map((x) => x.split(', '))
    .reduce((x, y) => (Number(x[0].slice(0, -2)) > Number(y[0].slice(0, -2)) ? x : y), ['0.00ms', '0.0MB'])
    .map((x) => x.replace(/(?<=[0-9])(?=[A-Za-z])/, ' '));

  /*프로그래밍 언어별 폴더 정리 옵션을 위한 언어 값 가져오기*/
  const language = document.querySelector('div#tour7 > button').textContent.trim();

  return makeData({ link, problemId, level, title, problem_description, division, language_extension, code, result_message, runtime, memory, language });
}

async function makeData(origin) {
  const { problem_description, problemId, level, result_message, division, language_extension, title, runtime, memory, code, language } = origin;
  const directory = await getDirNameByOrgOption(`Programmers/src/PRO/Lv${level}`, language);
  const levelWithLv = `${level}`.includes('lv') ? level : `lv${level}`.replace('lv', 'level ');

  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const currentMonth = months[new Date().getMonth()];
  const message = `[${currentMonth}/PRO] ${problemId} ${title}`;
  
  const fileName = `PRO_${problemId}.${language_extension}`;
  const dateInfo = getDateString(new Date(Date.now()));

  const prBody = `
  # 🧩 알고리즘 문제 풀이
  ## 📝 문제 정보
  - **플랫폼:** 프로그래머스 ()
  - **문제 이름:** ${problemId} ${title}
  - **문제 링크:** ${link}
  - **난이도:** Lv.${level}
  - **알고리즘 유형:** ${division.replace('/', ' > ')}
  - **제출 일자:** ${dateInfo}

  ## 💡 문제 설명
  ${problem_description}

  ## ⏱️ 성능 요약
  ### 메모리
  ${memory}
  ### 시간
  ${runtime}

  > 출처: 프로그래머스 코딩 테스트 연습, https://school.programmers.co.kr/learn/challenges
  `;

  let finalCode = code;

  // Java 파일일 경우, 실행 가능한 main 클래스를 생성하고 기존 Solution 클래스를 래핑합니다.
  if (language_extension === 'java') {
    const solutionClassName = `Solution_${problemId}`; // 내부 풀이 클래스 이름
    const mainClassName = `PRO_${problemId}`;       // 실행용 public 클래스 이름 (파일명과 동일)

    // 기존 코드의 'public class Solution'을 'class Solution_문제번호'로 변경
    const modifiedSolutionClass = code.replace(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/, `class ${solutionClassName}`);

    // main 메서드를 포함하는 새로운 public 클래스 생성
    const mainClass = `
    public class ${mainClassName} {
      public static void main(String[] args) {
          ${solutionClassName} s = new ${solutionClassName}();
          // 테스트케이스를 활용해 코드를 실행코드 작성하시오.
      }
    }
    `;

    // 패키지 선언문
    const packageName = `package PRO.Lv${level};`;

    // 최종 코드를 조합: 패키지 선언부 + 실행용 클래스 + 풀이 클래스
    finalCode = `${packageName}\n\n${mainClass}\n\n${modifiedSolutionClass}`;
  }

  return { 
    problemId, 
    directory, 
    message, 
    fileName, 
    prBody, 
    code: finalCode 
  };
}
