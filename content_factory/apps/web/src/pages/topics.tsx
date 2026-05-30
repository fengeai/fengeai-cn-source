import type { GetServerSideProps } from 'next';

export default function TopicsRedirect() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: '/',
    permanent: false,
  },
});
