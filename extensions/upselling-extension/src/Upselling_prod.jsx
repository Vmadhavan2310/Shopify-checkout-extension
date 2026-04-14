import { render } from "preact";
import {
  useAppMetafields,
  useApi,
  useApplyCartLinesChange,
} from "@shopify/ui-extensions/checkout/preact";
import { useEffect, useState, useLayoutEffect } from "preact/hooks";

export default async () => {
  render(<Upselling_prod />, document.body);
};

function Upselling_prod() {
  const Api = useApi();
  const [upsellingId, setUpsellingId] = useState();
  const [products, setProducts] = useState([]);
  const addToCart = useApplyCartLinesChange();
  const [selectedProduct, setProduct] = useState({
    variantId: "",
    productId: "",
  });

  const metaProducts = useAppMetafields({
    type: "shop",
    key: "upselling_checkout",
    namespace: "custom",
  });
  const [metaObj] = metaProducts;

  useLayoutEffect(() => {
    if (metaObj?.metafield?.value) {
      const prodIds = JSON.parse(metaObj?.metafield?.value);
      setUpsellingId(prodIds);
      shopify
        .query(
          `query GetProductsByIds($ids: [ID!]!) {
                nodes(ids: $ids) {
                    ... on Product {
                        id
                        title
                        handle
                        images(first: 5) {
                            edges {
                                node {
                                    url
                                    altText
                                }
                            }
                        }
                        variants(first: 5) {
                            nodes{
                                title
                                id
                                availableForSale
                                price  {
                                amount
                                currencyCode
                            }
                        }
                    }
                }
                }
            }`,
          {
            variables: {
              ids: upsellingId,
            },
          },
        )
        .then((res) => {
          if (res.data && res.data.nodes) {
            setProducts(res.data.nodes.filter(Boolean));
          }
        });
    }
  }, [metaObj]);

  async function handleAddToCart(id) {
    setProduct({ ...selectedProduct, productId: id });
    await addToCart({
      type: "addCartLine",
      merchandiseId: selectedProduct.variantId,
      quantity: 1,
    });
    setProduct({});
  }
  return (
    <>
      <s-section heading="Upselling Products">
        <s-scroll-box maxBlockSize="400px" padding="large">
          <s-stack gap="base">
            {products.length > 0 ? (
              products.map((item) => {
                let variant = item?.variants.nodes[0];
                return (
                  <s-grid gridTemplateColumns="80px auto 100px">
                    <s-grid-item>
                      <s-link
                        href={`${Api.shop.storefrontUrl}/products/${item.handle}`}
                        target="_blank"
                      >
                        <s-product-thumbnail
                          src={item.images.edges[0].node.url}
                        ></s-product-thumbnail>
                      </s-link>
                    </s-grid-item>
                    <s-grid-item>
                      <s-stack gap="small">
                        <s-text>{item.title}</s-text>
                        <s-stack gap="small" direction="inline">
                          {item.variants.nodes.length > 0 &&
                            item.variants.nodes.map((v) => {
                              return (
                                <s-press-button
                                  disabled={!v.availableForSale}
                                  pressed={selectedProduct.variantId == v.id}
                                  onClick={() =>
                                    setProduct({
                                      variantId: v.id,
                                      productId: "",
                                    })
                                  }
                                >
                                  {v.title.toUpperCase()}
                                </s-press-button>
                              );
                            })}
                        </s-stack>
                      </s-stack>
                    </s-grid-item>
                    <s-grid-item>
                      <s-stack direction="block" alignItems="end" gap="small">
                        <s-text>
                          {Api.i18n.formatCurrency(variant.price.amount)}
                        </s-text>
                        <s-button
                          variant="primary"
                          onClick={() => handleAddToCart(item.id)}
                          loading={item.id == selectedProduct.productId}
                        >
                          Add Cart
                        </s-button>
                      </s-stack>
                    </s-grid-item>
                  </s-grid>
                );
              })
            ) : (
              <>
                <s-stack gap="large">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <s-skeleton-paragraph key={i}></s-skeleton-paragraph>
                  ))}
                </s-stack>
              </>
            )}
          </s-stack>
        </s-scroll-box>
      </s-section>
    </>
  );
}
