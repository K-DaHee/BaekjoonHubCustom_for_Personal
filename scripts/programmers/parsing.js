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

  const clean_description = convertHtmlToMarkdown(problem_description);

  const prBody = `
  # 🧩 알고리즘 문제 풀이
  ## 📝 문제 정보
  - **플랫폼:** 프로그래머스 (PRO)
  - **문제 이름:** ${problemId} ${title}
  - **문제 링크:** ${link}
  - **난이도:** Lv.${level}
  - **알고리즘 유형:** ${division.replace('/', ' > ')}
  - **제출 일자:** ${dateInfo}

  ## 💡 문제 설명
  ${clean_description}

  ## ⏱️ 성능 요약
  ### 메모리
  ${memory}
  ### 시간
  ${runtime}

  ## 🤔 접근 방법
  #접근방법#

  ## 🤯 어려웠던 점
  #어려웠던점#

  ## 📚 배운 점
  #배운점#

  ## ✅ 자가 체크리스트

  - [ ] 코드가 모든 테스트 케이스를 통과하나요?
  - [ ] 코드에 주석을 충분히 달았나요?
  

  > 출처: 프로그래머스 코딩 테스트 연습, https://school.programmers.co.kr/learn/challenges
  `;

  let finalCode = code;

  // Java 파일일 경우, 실행 가능한 main 클래스를 생성하고 기존 Solution 클래스를 래핑합니다.
  if (language_extension === 'java') {
    const solutionClassName = `Solution_${problemId}`;
    const mainClassName = `PRO_${problemId}`;
    
    // import 구문들을 모두 찾기
    const importRegex = /import\s+.*?;/g;
    const importMatches = code.match(importRegex);
    // 찾은 import 구문들을 줄바꿈으로 합치기. 없으면 빈 문자열.
    const importBlock = importMatches ? importMatches.join('\n') : '';

    // 원본 코드에서 import 구문들을 제거
    const codeWithoutImports = code.replace(importRegex, '').trim();

    // import가 제거된 코드에서 class 이름 변경
    const modifiedSolutionClass = codeWithoutImports.replace(/(public\s*)?class\s*Solution/, `class ${solutionClassName}`);
    
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

    // 최종 코드 조합
    // 패키지 -> import -> 실행용 클래스 -> 풀이 클래스
    finalCode = `${packageName}\n${importBlock}\n${mainClass}\n${modifiedSolutionClass}`;
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

// HTML을 마크다운으로 변환하는 헬퍼 함수
function convertHtmlToMarkdown(htmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');

  // 테이블 변환
  const tables = doc.querySelectorAll('table');
  tables.forEach(table => {
      let mdTable = '\n';
      
      // 헤더 처리
      const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
      if (headers.length > 0) {
          mdTable += `| ${headers.join(' | ')} |\n`;
          mdTable += `| ${headers.map(() => '---').join(' | ')} |\n`;
      }

      // 본문 처리
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach(row => {
          const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim());
          mdTable += `| ${cells.join(' | ')} |\n`;
      });
      
      mdTable += '\n';

      // 테이블 태그를 마크다운 텍스트 노드로 교체
      const textNode = document.createTextNode(mdTable);
      table.parentNode.replaceChild(textNode, table);
  });

  // 나머지 태그 정규식 변환
  let content = doc.body.innerHTML;

  content = content
      // <h5> => Bold
      .replace(/<h5>(.*?)<\/h5>/gi, '**$1**')
      // <ul> => 삭제 (내부 li는 처리됨)
      .replace(/<\/?ul[^>]*>/gi, '')
      // <li> => - 
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<\/li>/gi, '') 
      // <br> => 줄바꿈
      .replace(/<br\s*\/?>/gi, '\n')
      // <p> => 삭제
      .replace(/<\/?p[^>]*>/gi, '')
      // 나머지 태그 삭제 (span, div, img 등 정리)
      .replace(/<[^>]*>?/gm, '')
      // 공백 정리
      .replace(/&nbsp;/gi, ' ')
      .trim();

  return content;
}
