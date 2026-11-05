import { go } from "../../app/navigation";
import { Segmented, TopBar } from "../../components/ui";
import { POLICY_DOCUMENTS, isPolicyKey, type PolicyKey } from "./policyDocuments";

const POLICY_TABS: { value: PolicyKey; label: string }[] = [
  { value: "terms", label: "이용약관" },
  { value: "privacy", label: "개인정보 처리방침" },
];

/** 이용약관·개인정보 처리방침(#policy/terms, #policy/privacy). 위 탭으로 두 문서를 오갑니다. */
export default function PolicyScreen({ routeId }: { routeId: string }) {
  const key: PolicyKey = isPolicyKey(routeId) ? routeId : "terms";
  const document = POLICY_DOCUMENTS[key];

  return (
    <main className="r-screen r-me-policy">
      <TopBar title="약관 및 정책" fallback="settings" />
      <div className="r-me-body">
        <Segmented<PolicyKey>
          label="볼 문서 고르기"
          value={key}
          // 탭을 바꿔도 뒤로 가기는 설정으로 바로 돌아가도록 주소만 바꿉니다.
          onChange={(next) => go("policy", next, true)}
          options={POLICY_TABS}
        />
        <p className="r-me-policy__draft">초안이에요. 정식 출시 전에 법률 검토를 거쳐 바뀔 수 있어요.</p>

        <article className="r-card r-me-policy__doc" aria-labelledby="r-me-policy-title">
          <h1 id="r-me-policy-title">{document.title}</h1>
          <p className="r-me-policy__summary">{document.summary}</p>
          {document.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.blocks.map((block, index) =>
                typeof block === "string" ? (
                  <p key={index}>{block}</p>
                ) : (
                  <ul key={index}>
                    {block.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ),
              )}
            </section>
          ))}
        </article>
      </div>
    </main>
  );
}
