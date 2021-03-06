package me.self.familytree.controller

import io.micronaut.core.type.GenericArgument
import io.micronaut.http.HttpRequestFactory
import io.micronaut.http.client.RxHttpClient
import io.micronaut.http.client.annotation.Client
import io.micronaut.runtime.server.EmbeddedServer
import io.micronaut.test.annotation.MicronautTest
import me.self.familytree.beans.*
import me.self.familytree.utils.execute
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import javax.inject.Inject

@MicronautTest
class FamilyTreeControllerTest {

    @Inject
    lateinit var embeddedServer: EmbeddedServer

    @Inject
    @field:Client("/", configuration = HttpClientConfigurationForTest::class)
    lateinit var client: RxHttpClient

    private fun addPerson(name: String): PersonView? {
        val person = Person()
        person.addName(name)
        person.bioGender = Gender.Male
        val request = HttpRequestFactory.INSTANCE.post("/v1/person", person)
        val response = client.toBlocking().retrieve(request, PersonView::class.java)
        return response
    }

    @Test
    fun testAddPerson() {
        val name = "Controller Test ${System.nanoTime()}"
        val person = addPerson(name)
        assertNotNull(person?.id)
        assertTrue(person?.names?.contains(name) == true)
    }

    @Test
    fun testAddRelation() {
        val firstId = addPerson("Controller First ${System.nanoTime()}")?.id!!
        val secondId = addPerson("Controller Second ${System.nanoTime()}")?.id!!
        val requestBody = RelationRequest(
                firstId,
                secondId,
                FamilyRelations.Type.Parent,
                "bioFather",
                "bio"
        )
        val request = HttpRequestFactory.INSTANCE.post("/v1/relation", requestBody)
        val response = client.toBlocking().retrieve(request, PersonView::class.java)
        assertNotNull(response)
        assertTrue(response?.parents?.firstOrNull()?.personId == secondId)
    }

    @Test
    fun testAddSpouseRelation() {
        val firstId = addPerson("Controller First ${System.nanoTime()}")?.id!!
        val secondId = addPerson("Controller Second ${System.nanoTime()}")?.id!!
        val requestBody = RelationRequest(firstId, secondId, FamilyRelations.Type.Spouse)
        val request = HttpRequestFactory.INSTANCE.post("/v1/relation", requestBody)
        val response = client.toBlocking().retrieve(request, PersonView::class.java)
        assertNotNull(response?.spouses?.firstOrNull())
    }

    @Test
    fun testRemoveRelation() {
        val firstId = addPerson("Controller First ${System.nanoTime()}")?.id!!
        val secondId = addPerson("Controller Second ${System.nanoTime()}")?.id!!
        val requestBody = RelationRequest(
                firstId,
                secondId,
                FamilyRelations.Type.Parent,
                "bioFather",
                "bio"
        )
        val request = HttpRequestFactory.INSTANCE.post("/v1/relation", requestBody)
        val response = client.toBlocking().retrieve(request, PersonView::class.java)
        assertNotNull(response)
        assertTrue(response?.parents?.firstOrNull()?.personId == secondId)
        val request2 = HttpRequestFactory.INSTANCE.put("/v1/relation/delete", requestBody)
        val response2 = client.toBlocking().retrieve(request2, PersonView::class.java)
        assertNotNull(response2)
        assertNull(response2?.parents?.firstOrNull())
    }

    /**
     * endpoint `GET  /v1/persons` takes very long time for first running
     * disable this test to save time
     */
//    @Test
    fun testAddAsRelationAndList() {
        val firstId = addPerson("Controller First ${System.nanoTime()}")?.id!!
        val anotherPerson = Person().also {
            it.addName("Relation Of")
            it.bioGender = Gender.Female
        }
        val requestBody = PersonWithRelationRequest(
                firstId,
                anotherPerson,
                FamilyRelations.Type.Parent,
                "bioMother",
                "bio"
        )
        val request = HttpRequestFactory.INSTANCE.post("/v1/person/relation", requestBody)
        val response = client.toBlocking().retrieve(request, PersonView::class.java)
        val secondId = response?.id
        assertNotNull(secondId)
        assertTrue(response?.children?.firstOrNull()?.personId == firstId)
        val request2 = HttpRequestFactory.INSTANCE.get<String>("/v1/persons?id=$firstId")
        val response2: List<PersonView>? = client.execute(request2) // generic issue here
        println(response2)
        assertNotNull(response2)
        assertTrue(response2!!.size >= 2)
        assertTrue(response2.map { it.id }.toSet().containsAll(setOf(firstId, secondId)))
    }

}
