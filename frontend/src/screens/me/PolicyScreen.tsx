import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import { Segmented, TopBar } from "../../components/ui";
import { EFFECTIVE_DATE, POLICY_DOCUMENTS, isPolicyKey, type PolicyKey } from "./policyDocuments";

const POLICY_TABS: { value: PolicyKey; label: string }[] = [
  { value: "terms", label: "이용약관" },
  { value: "privacy", label: "개인정보 처리방침" },
];

/**
 * 이용약관·개인정보 처리방침(#policy/terms, #policy/privacy, 보드 17-03): 위 탭으로 두 문서를 오가고, 회색 초안 안내 · 개정일 ·
 * "맛다공 이용약관 (초안)" 제목 · 번호 붙은 조항을 카드 없이 이어 둡니다.
 */
export default function PolicyScreen({ routeId }: { routeId: string }) {
  const key: PolicyKey = isPolicyKey(routeId) ? routeId : "terms";
  const document = POLICY_DOCUMENTS[key];

  return (
    <main className="r-screen r-me-policy">
      <TopBar title="이용약관 · 개인정보" fallback="settings" />
      <div className="r-me-body">
        <Segmented<PolicyKey>
          label="볼 문서 고르기"
          value={key}
          // 탭을 바꿔도 뒤로 가기는 설정으로 바로 돌아가도록 주소만 바꿉니다.
          onChange={(next) => go("policy", next, true)}
          options={POLICY_TABS}
        />
        <p className="r-info-note">
          <Icon name="info" />
          현재 정책 본문은 법률 검토 전 초안입니다.
        </p>
        <p className="r-me-policy__date">개정일: {EFFECTIVE_DATE} (초안)</p>

        <article className="r-me-policy__doc" aria-labelledby="r-me-policy-title">
          <h1 id="r-me-policy-title">맛다공 {document.title} (초안)</h1>
          <p className="r-me-policy__summary">{document.summary}</p>
          {document.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.blocks.map((block, index) =>
                typeof block === "string" ? (
                  <p key={index}>{block}</p>
                ) : (
                  <ol key={index}>
                    {block.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                ),
              )}
            </section>
          ))}
        </article>
      </div>
    </main>
  );
}
