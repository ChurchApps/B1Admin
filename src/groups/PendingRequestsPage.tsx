import { Loading, Locale } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { GroupJoinRequestInterface } from "@churchapps/helpers";
import { PendingJoinRequests } from "./components/PendingJoinRequests";
import "./omarchy.css";

const PendingRequestsPage = () => {
  const requests = useQuery<GroupJoinRequestInterface[]>({
    queryKey: ["/groupjoinrequests/pending", "MembershipApi"],
    placeholderData: []
  });

  if (requests.isLoading) return <Loading />;

  return (
    <main className="og-page" data-testid="pending-requests-page">
      <div className="og-head-verbs">
        <Link to="/groups">{Locale.label("groups.groupsPage.groups")}</Link>
      </div>
      <h1>{Locale.label("groups.pendingRequestsPage.title")}</h1>
      <p className="og-lede">{Locale.label("groups.pendingRequestsPage.subtitle")}</p>
      {requests.data && requests.data.length > 0 ? (
        <PendingJoinRequests
          requests={requests.data}
          showGroupName
          onChanged={() => requests.refetch()}
        />
      ) : (
        <p className="og-empty" data-testid="pending-requests-empty">
          {Locale.label("groups.pendingRequestsPage.empty")}
        </p>
      )}
    </main>
  );
};

export default PendingRequestsPage;
